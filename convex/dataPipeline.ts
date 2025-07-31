import { v } from "convex/values";
import { action, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { BillData } from "../types";
import { XMLParser } from "fast-xml-parser";

export const getLastCheckedTimestamp = internalQuery({
  args: {},
  returns: v.union(v.object({ timestamp: v.number() }), v.null()),
  handler: async (ctx) => {
    const lastCheckedTimestamp = await ctx.db.query("lastCheckedTimestamp").first();
    return lastCheckedTimestamp;
  },
});


export const discoverNewBillFiles = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // TODO: Implement this
    const billTypes = ["hconres", "hres", "hr", "hjres", "sconres", "sres", "s", "sjres"];
    // fetch lastcheckedtimestamp from convex db
    const lastCheckedTimestamp = await ctx.runQuery(internal.dataPipeline.getLastCheckedTimestamp);
    const lastCheckedTimestampValue = lastCheckedTimestamp?.timestamp ?? 0;
    console.log("Last checked timestamp:", lastCheckedTimestampValue);

    for (const billType of billTypes) {
      const govInfoUrl = `https://www.govinfo.gov/bulkdata/json/BILLS/119/1/${billType}/`;
      const response = await fetch(govInfoUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      console.log(response);
      const data: BillData = await response.json();
      const modifiedBillLinks: string[] = [];
      for (const file of data.files ?? []) {
        const fileLastModifiedTime = new Date(file.formattedLastModifiedTime);
        if (fileLastModifiedTime.getTime() > lastCheckedTimestampValue) {
          modifiedBillLinks.push(file.link);
        }
      }
      console.log(modifiedBillLinks);
      /*modifiedBillLinks.forEach(async (billLink) => {
        console.log(`Ingested and enriched ${billLink}`);
        await ctx.runAction(internal.dataPipeline.ingestAndEnrichBillFile, { billLink });
      });*/
      await ctx.runAction(internal.dataPipeline.ingestAndEnrichBillFile, { billLink: modifiedBillLinks[0] });
    }
    return null;
  },
});

export const ingestAndEnrichBillFile = internalAction({
  args: {
    billLink: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // TODO: Implement this
    const billLink = args.billLink;
    const response = await fetch(billLink);
    const data = await response.text(); //xml
    
    // parse the XML data into a json object
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    const jsonData = parser.parse(data);
    
    // Log the parsed structure to understand the data format
    console.log("Parsed XML structure:", JSON.stringify(jsonData, null, 2));
    
    const billData = jsonData.bill ?? jsonData.resolution;
    if (billData) {
      console.log(billData);
    } else {
      console.log("No bill data found");
    }
    
    return null;
  },
});