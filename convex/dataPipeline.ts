import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
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
    const billTypes = ["hr"];
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
        /*for (const file of newXmlFiles) {
          processingPromises.push(ctx.runAction(internal.dataPipeline.ingestAndEnrichBillFile, { xmlUrl: file.link }));
        }*/
       processingPromises.push(ctx.runAction(internal.dataPipeline.ingestAndEnrichBillFile, { xmlUrl: newXmlFiles[0].link }));
      } else {
        console.log(`No new XML files found for ${billType}`);
      }

    }

    await Promise.all(processingPromises); // wait for all the promises to complete
    // update the last checked timestamp
    await ctx.runMutation(internal.dataPipeline.updateLastCheckedTimestamp, { timestamp: Date.now() });
    console.log("Finished processing new XML files");
    return null;
  },
});

export const ingestAndEnrichBillFile = internalAction({
  args: {
    xmlUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // TODO: Implement this
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
    console.log("Parsed XML structure:", JSON.stringify(jsonData, null, 2));
    
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
    
    // Improved regex to handle different spacing
    const billParts = legisNum.match(/(S|H)\.?\s*(J\.?\s*RES\.?|CON\.?\s*RES\.?|RES\.?|R\.?)\s*(\d+)/i);
    if (!billParts) {
      throw new Error(`Could not parse bill number/type from legis-num: "${legisNum}" in ${args.xmlUrl}`);
    }
    
    const billType = (billParts[1] + billParts[2])
      .toLowerCase()
      .replace(/\s/g, '')
      .replace(/\./g, '');
    const billNumber = billParts[3];

    // B. Core Bill Information
    // The title can also be a complex object. Use our helper on the specific node.
    const officialTitle = extractBillText(billData.form["official-title"]).trim() || "No official title.";
    
    // Short title can be in multiple places. Let's look for it robustly.
    const firstSection = billData["legis-body"]?.section?.[0];
    const shortTitle = firstSection?.header === "Short title" ? extractBillText(firstSection.text).trim() : undefined;

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
    const actionDate = introAction?.["action-date"]?.["@_date"] ?? billData.form["action-date"]?.["@_date"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const committees = (introAction?.["action-desc"]?.["committee-name"] || []).map((node: any) => node["#text"]);

    // E. Full Text Extraction using our NEW helper
    const legisBody = billData["legis-body"] ?? billData["resolution-body"];
    const fullText = extractBillText(legisBody).replace(/\s+/g, ' ').trim();


    // --- 3. CONSTRUCT THE FINAL OBJECT ---
    const extractedData = {
      congress,
      billType,
      billNumber,
      versionCode,
      officialTitle,
      shortTitle,
      sponsor,
      cosponsors,
      committees,
      actionDate,
      xmlUrl: args.xmlUrl,
      fullText,
    };
    
    // For debugging, it's useful to see the final extracted data
    console.log("Successfully Extracted Data:", JSON.stringify({
      ...extractedData,
      // Truncate fullText for cleaner logs
      fullText: extractedData.fullText.substring(0, 200) + "..."
    }, null, 2));
    console.log("fullText", extractedData.fullText);

    // --- 4. TODO: NEXT STEPS FROM YOUR PLAN ---
    // Now you have a clean `extractedData` object with high-quality `fullText`.
    // You can now confidently proceed with your workflow.

    // Example:
    // await ctx.runMutation(internal.dataPipeline.finalizeAndPublishBill, {
    //    parsedData: extractedData,
    //    // aiData would be generated in subsequent steps...
    // });
    
    return null;
  },
});