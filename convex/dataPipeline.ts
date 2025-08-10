import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { BillData, ExtractedBillData, BillAnalysisInput } from "../types";
import { parseBillInfoFromUrl, getVersionPriority, parseBillXMLData, getBillStatusFromVersionCode } from "../utils/dataHelpers";
import { billAnalysisAgent, rag } from "./agent";

// Convex validators for our types
export const billSponsorValidator = v.object({
  name: v.string(),
  nameId: v.optional(v.string()),
});

export const extractedBillDataValidator = v.object({
  congress: v.number(),
  billType: v.string(),
  billNumber: v.string(),
  versionCode: v.string(),
  officialTitle: v.string(),
  cleanedShortTitle: v.optional(v.string()),
  sponsor: billSponsorValidator,
  cosponsors: v.array(billSponsorValidator),
  committees: v.array(v.string()),
  actionDate: v.optional(v.string()),
  xmlUrl: v.string(),
  fullText: v.string(),
  summary: v.string(),
  tagLine: v.string(),
  impactAreas: v.array(v.string()),
});

export const billSummaryDataValidator = v.object({
  summary: v.string(),
  tagLine: v.string(),
  impactAreas: v.array(v.string()),
  structuredSummary: v.optional(
    v.array(
      v.object({
        title: v.string(),
        text: v.string(),
        citations: v.optional(
          v.array(
            v.object({
              label: v.string(),
              sectionId: v.string(),
            }),
          ),
        ),
      }),
    ),
  ),
});

export const getLastCheckedTimestamp = internalQuery({
  args: {},
  returns: v.union(v.object({ 
    _id: v.id("lastCheckedTimestamp"),
    _creationTime: v.number(),
    timestamp: v.number() 
  }), v.null()),
  handler: async (ctx) => {
    const lastCheckedTimestamp = await ctx.db.query("lastCheckedTimestamp").first();
    return lastCheckedTimestamp;
  },
});

export const updateLastCheckedTimestamp = internalMutation({
  args: {
    timestamp: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    //get existing record or create a new one
    const existingRecord = await ctx.db.query("lastCheckedTimestamp").first();
    if (existingRecord) {
      await ctx.db.patch(existingRecord._id, { timestamp: args.timestamp });
    } else {
      await ctx.db.insert("lastCheckedTimestamp", { timestamp: args.timestamp });
    }
    return null;
  },
});

export const discoverNewBillFiles = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    //const billTypes = ["hconres", "hres", "hr", "hjres", "sconres", "sres", "s", "sjres"];
    //const billTypes = ["hr"];
    const billTypes = ["hr", "s", "hjres", "sjres"];
    // fetch lastcheckedtimestamp from convex db
    const lastCheckedTimestamp = await ctx.runQuery(internal.dataPipeline.getLastCheckedTimestamp);
    const lastCheckedTimestampValue = lastCheckedTimestamp?.timestamp ?? 0;
    console.log("Last checked timestamp:", lastCheckedTimestampValue);

    const processingPromises = [];

    for (const billType of billTypes) {
      const govInfoUrl = `https://www.govinfo.gov/bulkdata/json/BILLS/119/1/${billType}/`;
      const response = await fetch(govInfoUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch ${govInfoUrl}: ${response.statusText}`);
        continue;
      }

      const data: BillData = await response.json();
      const newXmlFiles = (data.files ?? []).filter(file => file.link.endsWith('.xml')).filter(file => {
        const fileLastModifiedTime = new Date(file.formattedLastModifiedTime);
        return fileLastModifiedTime.getTime() > lastCheckedTimestampValue;
      }).sort((a, b) => {
        // Sort by last modified time in descending order (latest first)
        const timeA = new Date(a.formattedLastModifiedTime).getTime();
        const timeB = new Date(b.formattedLastModifiedTime).getTime();
        return timeB - timeA;
      })

      if (newXmlFiles.length > 0) {
        console.log(`Found ${newXmlFiles.length} new XML files for ${billType}`);
        for (const file of newXmlFiles) {
          processingPromises.push(ctx.runAction(internal.dataPipeline.ingestAndEnrichBillFile, { xmlUrl: file.link }));
        }
      } else {
        console.log(`No new XML files found for ${billType}`);
      }

    }

    await Promise.all(processingPromises); // wait for all the promises to complete
    
    // Log processing statistics
    const totalProcessed = processingPromises.length;
    console.log(`Processing completed: ${totalProcessed} files processed`);
    
    // update the last checked timestamp
    await ctx.runMutation(internal.dataPipeline.updateLastCheckedTimestamp, { timestamp: Date.now() });
    console.log("Finished processing new XML files");
    return null;
  },
});

// Internal wrapper for cron jobs (cron jobs require internal functions)
export const discoverNewBillFilesCron = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Use the same logic as the public action
    const billTypes = ["hr", "s", "hjres", "sjres"];
    const lastCheckedTimestamp = await ctx.runQuery(internal.dataPipeline.getLastCheckedTimestamp);
    const lastCheckedTimestampValue = lastCheckedTimestamp?.timestamp ?? 0;
    console.log("Cron job - Last checked timestamp:", lastCheckedTimestampValue);

    const processingPromises = [];

    for (const billType of billTypes) {
      const govInfoUrl = `https://www.govinfo.gov/bulkdata/json/BILLS/119/1/${billType}/`;
      const response = await fetch(govInfoUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch ${govInfoUrl}: ${response.statusText}`);
        continue;
      }

      const data: BillData = await response.json();
      const newXmlFiles = (data.files ?? []).filter(file => file.link.endsWith('.xml')).filter(file => {
        const fileLastModifiedTime = new Date(file.formattedLastModifiedTime);
        return fileLastModifiedTime.getTime() > lastCheckedTimestampValue;
      }).sort((a, b) => {
        const timeA = new Date(a.formattedLastModifiedTime).getTime();
        const timeB = new Date(b.formattedLastModifiedTime).getTime();
        return timeB - timeA;
      })

      if (newXmlFiles.length > 0) {
        console.log(`Cron job - Found ${newXmlFiles.length} new XML files for ${billType}`);
        for (const file of newXmlFiles) {
          processingPromises.push(ctx.runAction(internal.dataPipeline.ingestAndEnrichBillFile, { xmlUrl: file.link }));
        }
      } else {
        console.log(`Cron job - No new XML files found for ${billType}`);
      }
    }

    await Promise.all(processingPromises);
    
    const totalProcessed = processingPromises.length;
    console.log(`Cron job - Processing completed: ${totalProcessed} files processed`);
    
    await ctx.runMutation(internal.dataPipeline.updateLastCheckedTimestamp, { timestamp: Date.now() });
    console.log("Cron job - Finished processing new XML files");
    return null;
  },
});

// Enhanced function to check if we should process this bill version
export const shouldProcessBillVersion = internalQuery({
  args: {
    xmlUrl: v.string(),
  },
  returns: v.object({
    shouldProcess: v.boolean(),
    reason: v.string(),
    existingBillId: v.optional(v.id("bills")),
  }),
  handler: async (ctx, args) => {
    try {
      // Check if this exact XML file was already processed
      const existingVersion = await ctx.db
        .query("billVersions")
        .withIndex("by_xmlUrl", (q) => q.eq("xmlUrl", args.xmlUrl))
        .first();
      
      if (existingVersion) {
        return {
          shouldProcess: false,
          reason: "Exact file already processed",
          existingBillId: existingVersion.billId,
        };
      }

      // Parse bill info from URL
      const billInfo = parseBillInfoFromUrl(args.xmlUrl);
      
      // Check if we have this bill already
      const existingBill = await ctx.db
        .query("bills")
        .withIndex("by_identifier", (q) => 
          q.eq("congress", billInfo.congress)
           .eq("billType", billInfo.billType)
           .eq("billNumber", billInfo.billNumber)
        )
        .first();

      if (!existingBill) {
        return {
          shouldProcess: true,
          reason: "New bill",
        };
      }

      // If we have the bill, check if this version is better
      const currentVersionPriority = existingBill.latestVersionCode 
        ? getVersionPriority(existingBill.latestVersionCode)
        : -1;
      const newVersionPriority = getVersionPriority(billInfo.versionCode);

      if (newVersionPriority > currentVersionPriority) {
        return {
          shouldProcess: true,
          reason: `Better version: ${billInfo.versionCode} > ${existingBill.latestVersionCode}`,
          existingBillId: existingBill._id,
        };
      } else if (newVersionPriority === currentVersionPriority) {
        return {
          shouldProcess: false,
          reason: `Same version priority: ${billInfo.versionCode} = ${existingBill.latestVersionCode}`,
          existingBillId: existingBill._id,
        };
      } else {
        return {
          shouldProcess: false,
          reason: `Lower version priority: ${billInfo.versionCode} < ${existingBill.latestVersionCode}`,
          existingBillId: existingBill._id,
        };
      }
    } catch (error) {
      console.error(`Error checking if should process ${args.xmlUrl}:`, error);
      // If we can't determine, err on the side of processing
      return {
        shouldProcess: true,
        reason: `Error determining priority: ${error}`,
      };
    }
  },
});

export const ingestAndEnrichBillFile = internalAction({
  args: {
    xmlUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Use smart processing to check if we should process this file
      const processDecision = await ctx.runQuery(internal.dataPipeline.shouldProcessBillVersion, { 
        xmlUrl: args.xmlUrl 
      });
      
      if (!processDecision.shouldProcess) {
        console.log(`Skipping ${args.xmlUrl}: ${processDecision.reason}`);
        return null;
      }

      console.log(`Processing: ${args.xmlUrl} (${processDecision.reason})`);
      
      // Fetch XML data
      const response = await fetch(args.xmlUrl);
      if (!response.ok) {
        console.error(`Failed to fetch ${args.xmlUrl}: ${response.statusText}`);
        return null;
      }
      const xmlData = await response.text();
    
      // Parse XML data using helper function
      const extractedData: ExtractedBillData = parseBillXMLData(xmlData, args.xmlUrl);

      // Generate AI summary and enrich data
      const summaryData = await ctx.runAction(internal.dataPipeline.getBillSummary, { 
        extractedData: {
          fullText: extractedData.fullText,
          billType: extractedData.billType,
          billNumber: extractedData.billNumber,
          versionCode: extractedData.versionCode,
          officialTitle: extractedData.officialTitle,
          cleanedShortTitle: extractedData.cleanedShortTitle,
          sponsor: extractedData.sponsor,
          cosponsors: extractedData.cosponsors,
          committees: extractedData.committees,
          actionDate: extractedData.actionDate,
        }
      });

      // Validate summary quality — require a non-empty summary
      const isEmptyString = (s: string | undefined) => !s || s.trim().length === 0;
      const structured = Array.isArray(summaryData.structuredSummary) ? summaryData.structuredSummary : [];
      const summaryLooksBad = isEmptyString(summaryData.summary) || summaryData.summary.length < 40; // heuristic floor

      if (summaryLooksBad) {
        await ctx.runMutation(internal.dataPipeline.recordFailedIngestion, {
          congress: extractedData.congress,
          billType: extractedData.billType,
          billNumber: extractedData.billNumber,
          versionCode: extractedData.versionCode,
          xmlUrl: extractedData.xmlUrl,
          reason: "Summary missing or too short",
          summaryAttempt: {
            summary: summaryData.summary,
            tagLine: summaryData.tagLine,
            impactAreas: summaryData.impactAreas,
            structuredSummary: structured,
          },
        });
        return null; // Abort: do not vectorize or store bill/version
      }

      // Optional: also mark as failed if structured summary is empty; keep as soft gate
      if (structured.length === 0) {
        await ctx.runMutation(internal.dataPipeline.recordFailedIngestion, {
          congress: extractedData.congress,
          billType: extractedData.billType,
          billNumber: extractedData.billNumber,
          versionCode: extractedData.versionCode,
          xmlUrl: extractedData.xmlUrl,
          reason: "Structured summary empty",
          summaryAttempt: {
            summary: summaryData.summary,
            tagLine: summaryData.tagLine,
            impactAreas: summaryData.impactAreas,
            structuredSummary: structured,
          },
        });
         return null;
      }

      // Update extracted data with AI-generated content
      extractedData.summary = summaryData.summary;
      extractedData.tagLine = summaryData.tagLine;
      extractedData.impactAreas = summaryData.impactAreas;
      const structuredSummary = summaryData.structuredSummary ?? [];

      // Vectorize the enriched data
      await ctx.runAction(internal.dataPipeline.vectorizeBillData, { extractedData });

      console.log("extractedData", JSON.stringify(extractedData, null, 2));

      // Store the extracted data in the database
      await ctx.runMutation(internal.dataPipeline.storeBillData, {
        congress: extractedData.congress,
        billType: extractedData.billType,
        billNumber: extractedData.billNumber,
        versionCode: extractedData.versionCode,
        officialTitle: extractedData.officialTitle,
        cleanedShortTitle: extractedData.cleanedShortTitle,
        sponsor: extractedData.sponsor,
        cosponsors: extractedData.cosponsors,
        committees: extractedData.committees,
        actionDate: extractedData.actionDate,
        xmlUrl: extractedData.xmlUrl,
        fullText: extractedData.fullText,
        summary: extractedData.summary,
        tagLine: extractedData.tagLine,
        impactAreas: extractedData.impactAreas,
        structuredSummary,
      });

      return null;
    } catch (error) {
      console.error(`Error processing ${args.xmlUrl}:`, error);
      return null;
    }
  },
});

// Record failed ingestion attempts to avoid polluting main tables
export const recordFailedIngestion = internalMutation({
  args: {
    congress: v.number(),
    billType: v.string(),
    billNumber: v.string(),
    versionCode: v.string(),
    xmlUrl: v.string(),
    reason: v.string(),
    summaryAttempt: v.optional(
      v.object({
        summary: v.optional(v.string()),
        tagLine: v.optional(v.string()),
        impactAreas: v.optional(v.array(v.string())),
        structuredSummary: v.optional(
          v.array(
            v.object({
              title: v.string(),
              text: v.string(),
              citations: v.optional(
                v.array(
                  v.object({
                    label: v.string(),
                    sectionId: v.string(),
                  }),
                ),
              ),
            }),
          ),
        ),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("failedIngestions", {
      congress: args.congress,
      billType: args.billType,
      billNumber: args.billNumber,
      versionCode: args.versionCode,
      xmlUrl: args.xmlUrl,
      reason: args.reason,
      summaryAttempt: args.summaryAttempt,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const getBillSummary = internalAction({
  args: {
    extractedData: v.object({
      fullText: v.string(),
      billType: v.string(),
      billNumber: v.string(),
      versionCode: v.string(),
      officialTitle: v.string(),
      cleanedShortTitle: v.optional(v.string()),
      sponsor: billSponsorValidator,
      cosponsors: v.array(billSponsorValidator),
      committees: v.array(v.string()),
      actionDate: v.optional(v.string()),
    }),
  },
  returns: billSummaryDataValidator, 
  handler: async (ctx, args) => {
    const { extractedData }: { extractedData: BillAnalysisInput } = args;
    
    try {
      // Create a detailed prompt for bill analysis
      const prompt = `Analyze this federal bill and provide:

1. A concise overall summary (3-6 sentences) explaining scope and intent.
2. A compelling one-sentence tagline that captures the essence of the bill.
3. 3-8 sections based on bill size. Each section must include a short title and 4-6 sentences of explanation.
4. For each section, include zero or more citations that map to specific parts of the bill text.
   - If the bill uses numbered sections (e.g., "SEC. 101" or "Section 202"), set sectionId to the numeric part (e.g., "101").
   - If numbered sections are not present, set sectionId to an EXACT 5-12 word phrase copied verbatim from the bill text that best anchors the cited passage.
   - The label can be human-friendly (e.g., "SEC. 101" or a short paraphrase), but sectionId MUST be numeric or the exact phrase from the text for reliable matching.
5. A list of impact areas from this predefined list: ["Agriculture", "Armed Forces", "Civil Rights", "Commerce", "Crime", "Economics", "Education", "Energy", "Environment", "Finance", "Government Operations", "Health", "Housing", "Immigration", "International Affairs", "Labor", "Law", "Native Americans", "Public Lands", "Science", "Social Issues", "Social Security", "Sports", "Taxation", "Technology", "Transportation", "Water Resources"].

Bill Details:
- Type: ${extractedData.billType.toUpperCase()}
- Number: ${extractedData.billNumber}
- Version: ${extractedData.versionCode}
- Title: ${extractedData.officialTitle}
- Short Title: ${extractedData.cleanedShortTitle || "None"}
- Sponsor: ${extractedData.sponsor.name}
- Committees: ${extractedData.committees.join(", ") || "None"}

Full Bill Text:
${extractedData.fullText}

Important formatting rules:
- Return ONLY a valid JSON object (no markdown or prose).
- Use this exact schema:
{
  "summary": string,
  "tagLine": string,
  "impactAreas": string[],
  "structuredSummary": [
    { "title": string, "text": string, "citations": [{ "label": string, "sectionId": string }] }
  ]
}
If citations are unavailable for a section, set "citations": [].`;

      // Generate text using the agent
      const { thread } = await billAnalysisAgent.createThread(ctx);
      const result = await thread.generateText({ prompt });
      
      // Parse the JSON response
      let parsedResult;
      try {
        // Strip Markdown code fences if present
        const raw = result.text.trim();
        const unwrapped = raw.startsWith("```")
          ? raw.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```\s*$/, "")
          : raw;
        parsedResult = JSON.parse(unwrapped);
      } catch {
        console.error("Failed to parse AI response as JSON:", result.text);
        // Fallback response
        parsedResult = {
          summary: `This ${extractedData.billType.toUpperCase()} ${extractedData.billNumber} (${extractedData.officialTitle}) introduces new federal legislation. The bill contains multiple provisions and would impact various aspects of federal policy if enacted.`,
          tagLine: `${extractedData.billType.toUpperCase()} ${extractedData.billNumber} introduces new federal legislation with multiple policy provisions.`,
          impactAreas: ["Government Operations", "Law"],
          structuredSummary: [],
        };
      }

      // Validate the response structure
      if (!parsedResult.summary || !parsedResult.tagLine || !Array.isArray(parsedResult.impactAreas)) {
        throw new Error("Invalid AI response structure");
      }

      return {
        summary: parsedResult.summary,
        tagLine: parsedResult.tagLine,
        impactAreas: parsedResult.impactAreas,
        structuredSummary: Array.isArray(parsedResult.structuredSummary)
          ? (parsedResult.structuredSummary as Array<{ title?: unknown; text?: unknown; citations?: Array<{ label?: unknown; sectionId?: unknown }>; }>)
              .map((s) => ({
                title: String(s.title ?? ""),
                text: String(s.text ?? ""),
                citations: Array.isArray(s.citations)
                  ? s.citations
                      .filter((c) => c && (c.label != null || c.sectionId != null))
                      .map((c) => ({
                        label: String(c.label ?? (c.sectionId ? `SEC. ${String(c.sectionId)}` : "")),
                        sectionId: String(c.sectionId ?? ""),
                      }))
                  : [],
              }))
          : [],
      };
    } catch (error) {
      console.error("Error generating bill summary:", error);
      // Return fallback data
      return {
        summary: `This ${extractedData.billType.toUpperCase()} ${extractedData.billNumber} (${extractedData.officialTitle}) introduces new federal legislation. The bill contains multiple provisions and would impact various aspects of federal policy if enacted.`,
        tagLine: `${extractedData.billType.toUpperCase()} ${extractedData.billNumber} introduces new federal legislation with multiple policy provisions.`,
        impactAreas: ["Government Operations", "Law"],
        structuredSummary: [],
      };
    }
  },
});

export const vectorizeBillData = internalAction({
  args: {
    extractedData: extractedBillDataValidator,
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { extractedData } = args;
    
    try {
      // Create a unique namespace for this bill
      const billIdentifier = `${extractedData.congress}-${extractedData.billType}-${extractedData.billNumber}`;
      
      // Simple but effective chunking strategy for legislative text
      const chunkBillText = (fullText: string, chunkSize: number = 2000, overlap: number = 200): string[] => {
        // If text is small enough, return as single chunk
        if (fullText.length <= chunkSize) {
          return [fullText];
        }

        const chunks: string[] = [];
        let start = 0;

        while (start < fullText.length) {
          let end = Math.min(start + chunkSize, fullText.length);
          
          // Try to break at a natural boundary (paragraph, sentence, or section)
          if (end < fullText.length) {
            // Look for section boundaries first (common in bills)
            const sectionBreak = fullText.lastIndexOf('\n\nSEC.', end);
            const paragraphBreak = fullText.lastIndexOf('\n\n', end);
            const sentenceBreak = fullText.lastIndexOf('. ', end);
            
            if (sectionBreak > start + chunkSize * 0.7) {
              end = sectionBreak + 2; // Include the newlines
            } else if (paragraphBreak > start + chunkSize * 0.7) {
              end = paragraphBreak + 2;
            } else if (sentenceBreak > start + chunkSize * 0.5) {
              end = sentenceBreak + 2;
            }
          }

          const chunk = fullText.slice(start, end).trim();
          if (chunk.length > 0) {
            chunks.push(chunk);
          }

          // Move start forward, accounting for overlap
          start = Math.max(start + chunkSize - overlap, end);
        }

        return chunks;
      };

      // Chunk the full text - now just the actual bill text without metadata
      const textChunks = chunkBillText(extractedData.fullText);
      
      console.log(`Chunked bill ${billIdentifier} into ${textChunks.length} chunks`);

      // Prepare metadata that will be stored separately from content
      const metadata = {
        billIdentifier,
        congress: extractedData.congress.toString(),
        billType: extractedData.billType,
        billNumber: extractedData.billNumber,
        versionCode: extractedData.versionCode,
        officialTitle: extractedData.officialTitle,
        cleanedShortTitle: extractedData.cleanedShortTitle || '',
        sponsorName: extractedData.sponsor.name,
        sponsorNameId: extractedData.sponsor.nameId || '',
        committees: extractedData.committees.join(', '),
        summary: extractedData.summary,
        tagLine: extractedData.tagLine,
        impactAreas: extractedData.impactAreas.join(', '),
        actionDate: extractedData.actionDate || '',
      };

      // Prepare filter values for filtering (order matches filterNames in agent.ts)
      const filterValues = [
        { name: "billIdentifier", value: billIdentifier },
        { name: "billType", value: extractedData.billType }, 
        { name: "congress", value: extractedData.congress.toString() },  
        { name: "sponsor", value: extractedData.sponsor.name },
      ];

      console.log(`Filter values for ${billIdentifier}:`, JSON.stringify(filterValues, null, 2));

      // Add the chunked content to RAG with metadata stored separately
      const { entryId } = await rag.add(ctx, {
        namespace: "bills", // Global namespace for all bills
        key: billIdentifier, // Unique key for this bill
        chunks: textChunks, // Pure bill text chunks without metadata
        title: `${extractedData.billType.toUpperCase()} ${extractedData.billNumber}: ${extractedData.cleanedShortTitle || extractedData.officialTitle}`,
        metadata, // Store structured metadata separately
        filterValues, // For filtering during search
      });

      console.log(`Successfully vectorized bill ${billIdentifier} with entry ID: ${entryId}`);
      
      return entryId;
    } catch (error) {
      console.error("Error vectorizing bill data:", error);
      // Return a fallback ID
      return `fallback-${Date.now()}`;
    }
  },
});

// Internal mutation to store bill data in the database
export const storeBillData = internalMutation({
  args: {
    congress: v.number(),
    billType: v.string(),
    billNumber: v.string(),
    versionCode: v.string(),
    officialTitle: v.string(),
    cleanedShortTitle: v.optional(v.string()),
    sponsor: billSponsorValidator,
    cosponsors: v.array(billSponsorValidator),
    committees: v.array(v.string()),
    actionDate: v.optional(v.string()),
    xmlUrl: v.string(),
    fullText: v.string(),
    summary: v.string(),
    tagLine: v.string(),
    impactAreas: v.array(v.string()),
    structuredSummary: v.optional(
      v.array(
        v.object({
          title: v.string(),
          text: v.string(),
          citations: v.optional(
            v.array(
              v.object({
                label: v.string(),
                sectionId: v.string(),
              }),
            ),
          ),
        }),
      ),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Handle sponsor politician
    let sponsorId = undefined;
    if (args.sponsor.nameId && args.sponsor.name !== "N/A") {
      sponsorId = await ctx.runMutation(internal.dataPipeline.upsertPolitician, {
        name: args.sponsor.name,
        govinfoId: args.sponsor.nameId,
      });
    }

    // 2. Handle cosponsor politicians
    for (const cosponsor of args.cosponsors) {
      if (cosponsor.nameId) {
        await ctx.runMutation(internal.dataPipeline.upsertPolitician, {
          name: cosponsor.name,
          govinfoId: cosponsor.nameId,
        });
      }
    }

    // 3. Check if bill already exists
    const existingBill = await ctx.db
      .query("bills")
      .withIndex("by_identifier", (q) => 
        q.eq("congress", args.congress)
         .eq("billType", args.billType)
         .eq("billNumber", args.billNumber)
      )
      .first();

    let billId: Id<"bills">;
    if (existingBill) {
      // Update existing bill with latest info
      await ctx.db.patch(existingBill._id, {
        title: args.officialTitle,
        cleanedShortTitle: args.cleanedShortTitle,
        sponsorId,
        committees: args.committees,
        latestVersionCode: args.versionCode,
        latestActionDate: args.actionDate,
        status: getBillStatusFromVersionCode(args.versionCode),
        summary: args.summary,
        tagline: args.tagLine,
        impactAreas: args.impactAreas,
        structuredSummary: args.structuredSummary,
      });
      billId = existingBill._id;
    } else {
      // Create new bill
      billId = await ctx.db.insert("bills", {
        congress: args.congress,
        billType: args.billType,
        billNumber: args.billNumber,
        title: args.officialTitle,
        cleanedShortTitle: args.cleanedShortTitle,
        sponsorId,
        committees: args.committees,
        latestVersionCode: args.versionCode,
        latestActionDate: args.actionDate,
        status: getBillStatusFromVersionCode(args.versionCode),
        summary: args.summary,
        tagline: args.tagLine,
        impactAreas: args.impactAreas,
        structuredSummary: args.structuredSummary,
      });
    }

    // 4. Check if this bill version already exists
    const existingVersion = await ctx.db
      .query("billVersions")
      .withIndex("by_billId_and_version", (q) =>
        q.eq("billId", billId).eq("versionCode", args.versionCode)
      )
      .first();

    if (!existingVersion) {
      // Store bill version
      await ctx.db.insert("billVersions", {
        billId,
        versionCode: args.versionCode,
        title: args.cleanedShortTitle || args.officialTitle,
        publishedDate: args.actionDate || new Date().toISOString().split('T')[0],
        fullText: args.fullText,
        xmlUrl: args.xmlUrl,
        textLength: args.fullText.length,
      });
    }

    return null;
  },
});

// Helper function to upsert politicians
export const upsertPolitician = internalMutation({
  args: {
    name: v.string(),
    govinfoId: v.string(),
  },
  returns: v.id("politicians"),
  handler: async (ctx, args) => {
    // Check if politician already exists by govinfoId
    const existing = await ctx.db
      .query("politicians")
      .withIndex("by_govinfoId", (q) => q.eq("govinfoId", args.govinfoId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new politician (you'll need to enhance this with party, state, chamber data)
    return await ctx.db.insert("politicians", {
      name: args.name,
      govinfoId: args.govinfoId,
      party: "Unknown", // TODO: Extract from another data source
      state: "Unknown", // TODO: Extract from another data source  
      chamber: "House", // TODO: Determine from bill type or other data
    });
  },
});