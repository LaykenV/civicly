import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { BillData, ExtractedBillData } from "../types";
import { parseBillInfoFromUrl, getVersionPriority, parseBillXMLData } from "../utils/dataHelpers";
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
  ragId: v.string(),
  tagLine: v.string(),
  impactAreas: v.array(v.string()),
});

export const billSummaryDataValidator = v.object({
  summary: v.string(),
  tagLine: v.string(),
  impactAreas: v.array(v.string()),
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
      .slice(0, 1); // Take only the 1 latest for testing

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
      .slice(0, 1); // Process more files in cron jobs since they run automatically

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
        .filter((q) => q.eq(q.field("xmlUrl"), args.xmlUrl))
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

      // Update extracted data with AI-generated content
      extractedData.summary = summaryData.summary;
      extractedData.tagLine = summaryData.tagLine;
      extractedData.impactAreas = summaryData.impactAreas;

      // Vectorize the enriched data
      const ragId = await ctx.runAction(internal.dataPipeline.vectorizeBillData, { extractedData });
      extractedData.ragId = ragId;

      console.log("extractedData", JSON.stringify(extractedData, null, 2));

      // Store the extracted data in the database
      await ctx.runMutation(internal.dataPipeline.storeBillData, extractedData);

      return null;
    } catch (error) {
      console.error(`Error processing ${args.xmlUrl}:`, error);
      return null;
    }
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
    const { extractedData } = args;
    
    try {
      // Create a detailed prompt for bill analysis
      const prompt = `Analyze this federal bill and provide:

1. A comprehensive summary (2-3 paragraphs) explaining what the bill does, its key provisions, and potential implications
2. A compelling one-sentence tagline that captures the essence of the bill  
3. A list of impact areas from this predefined list: ["Agriculture", "Armed Forces", "Civil Rights", "Commerce", "Crime", "Economics", "Education", "Energy", "Environment", "Finance", "Government Operations", "Health", "Housing", "Immigration", "International Affairs", "Labor", "Law", "Native Americans", "Public Lands", "Science", "Social Issues", "Social Security", "Sports", "Taxation", "Technology", "Transportation", "Water Resources"]

Bill Details:
- Type: ${extractedData.billType.toUpperCase()}
- Number: ${extractedData.billNumber}
- Version: ${extractedData.versionCode}
- Title: ${extractedData.officialTitle}
- Short Title: ${extractedData.cleanedShortTitle || "None"}
- Sponsor: ${extractedData.sponsor.name}
- Committees: ${extractedData.committees.join(", ") || "None"}

Full Bill Text:
${extractedData.fullText.slice(0, 8000)} ${extractedData.fullText.length > 8000 ? '...' : ''}

Please respond with ONLY a valid JSON object in this exact format:
{
  "summary": "Your comprehensive summary here",
  "tagLine": "Your one-sentence tagline here",
  "impactAreas": ["ImpactArea1", "ImpactArea2", "ImpactArea3"]
}`;

      // Generate text using the agent
      const { thread } = await billAnalysisAgent.createThread(ctx);
      const result = await thread.generateText({ prompt });
      
      // Parse the JSON response
      let parsedResult;
      try {
        parsedResult = JSON.parse(result.text);
      } catch {
        console.error("Failed to parse AI response as JSON:", result.text);
        // Fallback response
        parsedResult = {
          summary: `This ${extractedData.billType.toUpperCase()} ${extractedData.billNumber} (${extractedData.officialTitle}) introduces new federal legislation. The bill contains multiple provisions and would impact various aspects of federal policy if enacted.`,
          tagLine: `${extractedData.billType.toUpperCase()} ${extractedData.billNumber} introduces new federal legislation with multiple policy provisions.`,
          impactAreas: ["Government Operations", "Law"]
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
      };
    } catch (error) {
      console.error("Error generating bill summary:", error);
      // Return fallback data
      return {
        summary: `This ${extractedData.billType.toUpperCase()} ${extractedData.billNumber} (${extractedData.officialTitle}) introduces new federal legislation. The bill contains multiple provisions and would impact various aspects of federal policy if enacted.`,
        tagLine: `${extractedData.billType.toUpperCase()} ${extractedData.billNumber} introduces new federal legislation with multiple policy provisions.`,
        impactAreas: ["Government Operations", "Law"],
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
      
      // Prepare the text content for vectorization
      const contentToVectorize = `
Title: ${extractedData.officialTitle}
${extractedData.cleanedShortTitle ? `Short Title: ${extractedData.cleanedShortTitle}` : ''}
Type: ${extractedData.billType.toUpperCase()} ${extractedData.billNumber}
Congress: ${extractedData.congress}
Version: ${extractedData.versionCode}
Sponsor: ${extractedData.sponsor.name}
Committees: ${extractedData.committees.join(", ")}
Summary: ${extractedData.summary}
Tag Line: ${extractedData.tagLine}
Impact Areas: ${extractedData.impactAreas.join(", ")}

Full Text:
${extractedData.fullText}
      `.trim();

      // Add the bill content to RAG for search
      const { entryId } = await rag.add(ctx, {
        namespace: "bills", // Global namespace for all bills
        key: billIdentifier, // Unique key for this bill
        text: contentToVectorize,
        // Store metadata for filtering
        filterValues: [
          { name: "billType", value: extractedData.billType },
          { name: "congress", value: extractedData.congress.toString() },
          { name: "sponsor", value: extractedData.sponsor.name },
          ...extractedData.impactAreas.map(area => ({ name: "impactArea", value: area })),
          ...extractedData.committees.map(committee => ({ name: "committee", value: committee })),
        ],
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
    ragId: v.string(),
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
        status: "Introduced", // You can enhance this based on version codes
        summary: args.summary,
        tagline: args.tagLine,
        impactAreas: args.impactAreas,
        ragId: args.ragId,
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
        status: "Introduced",
        summary: args.summary,
        tagline: args.tagLine,
        impactAreas: args.impactAreas,
        ragId: args.ragId,
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
      .filter((q) => q.eq(q.field("govinfoId"), args.govinfoId))
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