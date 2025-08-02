import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
//import { Id } from "./_generated/dataModel";
import { BillData } from "../types";
import { XMLParser } from "fast-xml-parser";
import { extractBillText } from "../utils/dataHelpers";

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
      });

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

// Helper function to extract bill information from XML URL
export const parseBillInfoFromUrl = (xmlUrl: string) => {
  const urlMatch = xmlUrl.match(/BILLS-(\d{3})([a-zA-Z]+)(\d+)([a-zA-Z]{2,3})\.xml$/);
  if (!urlMatch) {
    throw new Error(`Could not parse bill info from URL: ${xmlUrl}`);
  }
  
  const [, congress, billType, billNumber, versionCode] = urlMatch;
  return {
    congress: parseInt(congress),
    billType,
    billNumber,
    versionCode
  };
};

// Helper function to determine version priority (higher number = more important)
export const getVersionPriority = (versionCode: string): number => {
  const versionPriority = ["ih", "pcs", "rh", "eh", "enr"]; // Introduced -> Enrolled
  const index = versionPriority.indexOf(versionCode);
  return index === -1 ? -1 : index; // Unknown versions get lowest priority
};

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
      const xmlUrl = args.xmlUrl;
      const response = await fetch(xmlUrl);
      if (!response.ok) {
        console.error(`Failed to fetch ${xmlUrl}: ${response.statusText}`);
        return null;
      }
      const data = await response.text(); //xml
    
      // parse the XML data into a json object
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        ignoreDeclaration: true,
        ignorePiTags: true,
        parseTagValue: true,
        isArray: (tagName) => [
          "cosponsor", "committee-name", "section", "subsection",
          "paragraph", "subparagraph", "clause", "subclause", "item"
        ].includes(tagName),
      });
      const jsonData = parser.parse(data);
      
      // Log the parsed structure to understand the data format
      //console.log("Parsed XML structure:", JSON.stringify(jsonData, null, 2));
      
      const billData = jsonData.bill ?? jsonData.resolution;
      if (!billData) {
        console.error(`No 'bill' or 'resolution' root element found in ${args.xmlUrl}`);
        return null;
      }

      // --- 2. EXTRACT STRUCTURED METADATA ---
      
      // A. Bill Identifier fields
      const legisNum = billData.form["legis-num"]["#text"] || billData.form["legis-num"]; // Handle both object and string cases
      const congressText = billData.form.congress["#text"] || billData.form.congress;
      const congress = parseInt(congressText.match(/(\d+)/)?.[1] || congressText);
      
      // Improved regex to handle different spacing and simple bills
      const billParts = legisNum.match(/(S|H)\.?\s*(?:(J\.?\s*RES\.?|CON\.?\s*RES\.?|RES\.?|R\.?)\s*)?(\d+)/i);
      if (!billParts) {
        throw new Error(`Could not parse bill number/type from legis-num: "${legisNum}" in ${args.xmlUrl}`);
      }
      
      // Handle simple bills vs resolutions
      const chamber = billParts[1]; // S or H
      const resolutionType = billParts[2] || ''; // Could be undefined for simple bills
      const billNumber = billParts[3];
      
      // Construct bill type
      let billType;
      if (!resolutionType) {
        // Simple bill: S -> s, H -> hr
        billType = chamber.toLowerCase() === 's' ? 's' : 'hr';
      } else {
        // Resolution: combine chamber and resolution type
        billType = (chamber + resolutionType)
          .toLowerCase()
          .replace(/\s/g, '')
          .replace(/\./g, '');
      }

      // B. Core Bill Information
      // The title can also be a complex object. Use our helper on the specific node.
      const officialTitle = extractBillText(billData.form["official-title"]).trim() || "No official title.";
      
      // Short title can be in multiple places. Let's look for it robustly.
      const firstSection = billData["legis-body"]?.section?.[0];
      let shortTitle = firstSection?.header === "Short title" ? extractBillText(firstSection.text).trim() : undefined;

      const versionCodeMatch = args.xmlUrl.match(/BILLS-\d{3}[a-zA-Z]+\d+([a-zA-Z]{2,3})\.xml$/);
      const versionCode = versionCodeMatch ? versionCodeMatch[1] : 'unknown';

      // C. Sponsor and Co-sponsor Information
      // Handle both single action object and array of actions
      const actions = Array.isArray(billData.form.action) ? billData.form.action : [billData.form.action].filter(Boolean);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const introAction = actions.find((a: any) => a?.["action-desc"]?.sponsor);
      
      let sponsor = { name: "N/A", nameId: undefined };
      if (introAction?.["action-desc"]?.sponsor) {
        const sponsorNode = introAction["action-desc"].sponsor;
        sponsor = {
          name: sponsorNode["#text"],
          nameId: sponsorNode["@_name-id"],
        };
      }

      // `isArray` in parser options simplifies this. Default to empty array if undefined.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cosponsors = (introAction?.["action-desc"]?.cosponsor || []).map((node: any) => ({
        name: node["#text"],
        nameId: node["@_name-id"],
      }));
      
      // D. Dates and Committees
      const actionDate = introAction?.["action-date"]?.["@_date"] ?? billData.form["action-date"]?.["@_date"] ?? billData.form["attestation-group"]?.["attestation-date"]?.["@_date"];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const committees = (introAction?.["action-desc"]?.["committee-name"] || []).map((node: any) => node["#text"]);

      // E. Full Text Extraction using our NEW helper
      const legisBody = billData["legis-body"] ?? billData["resolution-body"];
      const fullText = extractBillText(legisBody).replace(/\s+/g, ' ').trim();

      // F. Fix short title extraction after fullText is available
      if (!shortTitle) {
        const shortTitleMatch = fullText.match(/This Act may be cited as the [""]([^"""]+)[""]|This Act may be cited as the ([^.]+)\./i);
        if (shortTitleMatch) {
          shortTitle = shortTitleMatch[1] || shortTitleMatch[2];
        }
      }

      const cleanedShortTitle = shortTitle
        ? shortTitle.replace(/This Act may be cited as the\s*\.?$/i, '').replace(/[""]$/, '').trim() 
        : undefined;

      // --- 3. CONSTRUCT THE FINAL OBJECT ---
      const extractedData = {
        congress,
        billType,
        billNumber,
        versionCode,
        officialTitle,
        cleanedShortTitle,
        sponsor,
        cosponsors,
        committees,
        actionDate,
        xmlUrl: args.xmlUrl,
        fullText,
      };

      console.log("extractedData", JSON.stringify(extractedData, null, 2));

      // Store the extracted data in the database
      //await ctx.runMutation(internal.dataPipeline.storeBillData, extractedData);

      return null;
    } catch (error) {
      console.error(`Error processing ${args.xmlUrl}:`, error);
      return null;
    }
  },
});

// Internal mutation to store bill data in the database
/*export const storeBillData = internalMutation({
  args: {
    congress: v.number(),
    billType: v.string(),
    billNumber: v.string(),
    versionCode: v.string(),
    officialTitle: v.string(),
    cleanedShortTitle: v.optional(v.string()),
    sponsor: v.object({
      name: v.string(),
      nameId: v.optional(v.string()),
    }),
    cosponsors: v.array(v.object({
      name: v.string(),
      nameId: v.optional(v.string()),
    })),
    committees: v.array(v.string()),
    actionDate: v.optional(v.string()),
    xmlUrl: v.string(),
    fullText: v.string(),
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
        sponsorId,
        latestVersionCode: args.versionCode,
        status: "Introduced", // You can enhance this based on version codes
      });
      billId = existingBill._id;
    } else {
      // Create new bill
      billId = await ctx.db.insert("bills", {
        congress: args.congress,
        billType: args.billType,
        billNumber: args.billNumber,
        title: args.officialTitle,
        sponsorId,
        latestVersionCode: args.versionCode,
        status: "Introduced",
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
});*/