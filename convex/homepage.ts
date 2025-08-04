import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { rag } from "./agent";
import { Id } from "./_generated/dataModel";

// ===== MAIN DATA QUERIES =====

/**
 * Get the 10 most recently updated bills for the homepage content section.
 * Returns bills ordered by latestActionDate (descending) with sponsor information.
 */
export const getLatestBills = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("bills"),
    congress: v.number(),
    billType: v.string(),
    billNumber: v.string(),
    title: v.string(),
    tagline: v.optional(v.string()),
    status: v.string(),
    latestActionDate: v.optional(v.string()),
    impactAreas: v.optional(v.array(v.string())),
    sponsor: v.optional(v.object({
      name: v.string(),
      party: v.string(),
      state: v.string(),
      chamber: v.union(v.literal("House"), v.literal("Senate")),
    }))
  })),
  handler: async (ctx) => {
    // Get all bills and sort by latestActionDate in memory
    // Note: For better performance at scale, consider adding an index on latestActionDate
    const bills = await ctx.db.query("bills").collect();
    
    // Sort by latestActionDate (most recent first), handling null dates
    const sortedBills = bills.sort((a, b) => {
      const dateA = a.latestActionDate ? new Date(a.latestActionDate).getTime() : 0;
      const dateB = b.latestActionDate ? new Date(b.latestActionDate).getTime() : 0;
      return dateB - dateA;
    });
    
    // Take the top 10 and add sponsor information
    const latestBills = sortedBills.slice(0, 10);
    
    const billsWithSponsors = await Promise.all(
      latestBills.map(async (bill) => {
        let sponsor = undefined;
        
        if (bill.sponsorId) {
          const sponsorDoc = await ctx.db.get(bill.sponsorId);
          if (sponsorDoc) {
            sponsor = {
              name: sponsorDoc.name,
              party: sponsorDoc.party,
              state: sponsorDoc.state,
              chamber: sponsorDoc.chamber,
            };
          }
        }
        
        return {
          _id: bill._id,
          congress: bill.congress,
          billType: bill.billType,
          billNumber: bill.billNumber,
          title: bill.title,
          tagline: bill.tagline,
          status: bill.status,
          latestActionDate: bill.latestActionDate,
          impactAreas: bill.impactAreas,
          sponsor,
        };
      })
    );
    
    return billsWithSponsors;
  },
});

/**
 * Get detailed information for a specific bill.
 * Includes complete bill information, sponsor details, and latest version information.
 */
export const getBillById = query({
  args: { billId: v.id("bills") },
  returns: v.union(
    v.object({
      _id: v.id("bills"),
      congress: v.number(),
      billType: v.string(),
      billNumber: v.string(),
      title: v.string(),
      cleanedShortTitle: v.optional(v.string()),
      tagline: v.optional(v.string()),
      summary: v.optional(v.string()),
      status: v.string(),
      latestActionDate: v.optional(v.string()),
      latestVersionCode: v.optional(v.string()),
      impactAreas: v.optional(v.array(v.string())),
      committees: v.optional(v.array(v.string())),
      sponsor: v.optional(v.object({
        _id: v.id("politicians"),
        name: v.string(),
        party: v.string(),
        state: v.string(),
        chamber: v.union(v.literal("House"), v.literal("Senate")),
        govinfoId: v.optional(v.string()),
      })),
      latestVersion: v.optional(v.object({
        _id: v.id("billVersions"),
        versionCode: v.string(),
        title: v.string(),
        publishedDate: v.string(),
        xmlUrl: v.string(),
      })),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.billId);
    if (!bill) {
      return null;
    }
    
    // Get sponsor information if available
    let sponsor = undefined;
    if (bill.sponsorId) {
      const sponsorDoc = await ctx.db.get(bill.sponsorId);
      if (sponsorDoc) {
        sponsor = {
          _id: sponsorDoc._id,
          name: sponsorDoc.name,
          party: sponsorDoc.party,
          state: sponsorDoc.state,
          chamber: sponsorDoc.chamber,
          govinfoId: sponsorDoc.govinfoId,
        };
      }
    }
    
    // Get latest version information if available
    let latestVersion = undefined;
    if (bill.latestVersionCode) {
      const versionDoc = await ctx.db
        .query("billVersions")
        .withIndex("by_billId_and_version", (q) => 
          q.eq("billId", bill._id).eq("versionCode", bill.latestVersionCode!)
        )
        .first();
      
      if (versionDoc) {
        latestVersion = {
          _id: versionDoc._id,
          versionCode: versionDoc.versionCode,
          title: versionDoc.title,
          publishedDate: versionDoc.publishedDate,
          xmlUrl: versionDoc.xmlUrl,
        };
      }
    }
    
    return {
      _id: bill._id,
      congress: bill.congress,
      billType: bill.billType,
      billNumber: bill.billNumber,
      title: bill.title,
      cleanedShortTitle: bill.cleanedShortTitle,
      tagline: bill.tagline,
      summary: bill.summary,
      status: bill.status,
      latestActionDate: bill.latestActionDate,
      latestVersionCode: bill.latestVersionCode,
      impactAreas: bill.impactAreas,
      committees: bill.committees,
      sponsor,
      latestVersion,
    };
  },
});

/**
 * Provide semantic search functionality for the smart searchbar.
 * Uses RAG component for semantic search across bill content with metadata filtering.
 */
export const searchBills = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    billType: v.optional(v.string()),
    congress: v.optional(v.number()),
    impactAreas: v.optional(v.array(v.string())),
  },
  returns: v.object({
    results: v.array(v.object({
      _id: v.id("bills"),
      congress: v.number(),
      billType: v.string(),
      billNumber: v.string(),
      title: v.string(),
      tagline: v.optional(v.string()),
      status: v.string(),
      latestActionDate: v.optional(v.string()),
      impactAreas: v.optional(v.array(v.string())),
      sponsor: v.optional(v.object({
        name: v.string(),
        party: v.string(),
        state: v.string(),
        chamber: v.union(v.literal("House"), v.literal("Senate")),
      })),
      relevantText: v.string(),
      score: v.number(),
    })),
    summary: v.string(),
    resultCount: v.number(),
  }),
  handler: async (ctx, args) => {
    // Handle empty queries gracefully
    if (!args.query.trim()) {
      return {
        results: [],
        summary: "Please enter a search query to find relevant bills.",
        resultCount: 0,
      };
    }
    
    // Build filters based on provided criteria
    const filters = [];
    if (args.billType) {
      filters.push({ name: "billType", value: args.billType });
    }
    if (args.congress) {
      filters.push({ name: "congress", value: args.congress.toString() });
    }
    if (args.impactAreas && args.impactAreas.length > 0) {
      // Filter bills that contain any of the specified impact areas
      const impactAreasFilter = args.impactAreas.join(",");
      filters.push({ name: "impactAreas", value: impactAreasFilter });
    }
    
    // Perform RAG search with chunked context
    const { results } = await rag.search(ctx, {
      namespace: "bills",
      query: args.query,
      filters: filters.length > 0 ? filters : undefined,
      limit: args.limit || 10,
      vectorScoreThreshold: 0.3, // Lower threshold for broader search
      chunkContext: { before: 1, after: 1 }, // Include surrounding chunks for context
    });
    
    if (results.length === 0) {
      return {
        results: [],
        summary: `No bills found matching "${args.query}"${filters.length > 0 ? ' with the specified criteria' : ''}.`,
        resultCount: 0,
      };
    }
    
    // For now, return simplified results based on RAG search
    // This avoids the complexity of database queries in actions
    const searchResults = results.slice(0, 10).map((result, index) => {
      const content = result.content.map(c => c.text).join('\n');
      const relevantText = content.slice(0, 300) + (content.length > 300 ? '...' : '');
      
      // Extract basic info from the content if available
      const lines = content.split('\n');
      const titleLine = lines.find(line => line.startsWith('Title:'));
      const typeLine = lines.find(line => line.startsWith('Type:'));
      const congressLine = lines.find(line => line.startsWith('Congress:'));
      
      return {
        _id: `search_result_${index}` as Id<"bills">,
        congress: congressLine ? parseInt(congressLine.split(' ')[1]) || 119 : 119,
        billType: typeLine ? typeLine.split(' ')[1] || 'hr' : 'hr',
        billNumber: typeLine ? typeLine.split(' ')[2] || '1' : '1',
        title: titleLine ? titleLine.replace('Title: ', '') : 'Search Result',
        tagline: undefined,
        status: 'Unknown',
        latestActionDate: undefined,
        impactAreas: undefined,
        sponsor: undefined,
        relevantText,
        score: result.score,
      };
    });
    
    const summary = `Found ${searchResults.length} relevant sections for "${args.query}". The search identified content across ${results.length} sections of legislative text.`;
    
    return {
      results: searchResults,
      summary,
      resultCount: searchResults.length,
    };
  },
});

// ===== ANALYTICS & TRACKING =====

/**
 * Track search queries for analytics and improvement.
 * Stores search analytics with timestamp and basic metrics.
 */
export const logSearchQuery = mutation({
  args: {
    query: v.string(),
    resultCount: v.number(),
    userId: v.optional(v.id("users")),
    filters: v.optional(v.object({
      billType: v.optional(v.string()),
      congress: v.optional(v.number()),
      impactAreas: v.optional(v.array(v.string())),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Simple analytics storage - respecting user privacy
    await ctx.db.insert("searchAnalytics", {
      query: args.query.slice(0, 200), // Limit query length for storage
      resultCount: args.resultCount,
      userId: args.userId,
      filters: args.filters,
      timestamp: Date.now(),
      // No PII stored beyond optional userId
    });
    
    return null;
  },
}); 