import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
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
 * Get four specific trending bills by id, in fixed order.
 */
export const getTrendingBills = query({
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
    const trendingIds: Array<Id<"bills"> > = [
      "kn7b323dsbq8dpbvfgssj8ffrx7nft5n" as Id<"bills">,
      "kn776d3j2z2fnx9155b1dtqjmd7nfaf2" as Id<"bills">,
      "kn7a2j4w8spx5wbv9g223m0br97ne59e" as Id<"bills">,
      "kn7fgx0dsw9xs2b4x1a5ksbp4h7nfja7" as Id<"bills">,
    ];

    const results = [] as Array<{
      _id: Id<"bills">;
      congress: number;
      billType: string;
      billNumber: string;
      title: string;
      tagline?: string;
      status: string;
      latestActionDate?: string;
      impactAreas?: Array<string>;
      sponsor?: { name: string; party: string; state: string; chamber: "House" | "Senate" };
    }>;

    for (const billId of trendingIds) {
      const bill = await ctx.db.get(billId);
      if (!bill) continue;

      let sponsor = undefined as
        | { name: string; party: string; state: string; chamber: "House" | "Senate" }
        | undefined;

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

      results.push({
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
      });
    }

    return results;
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