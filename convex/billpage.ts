import { query } from "./_generated/server";
import { v } from "convex/values";

// ================================
// CORE BILL QUERIES
// ================================

/**
 * Get a bill by its identifier (congress, billType, billNumber)
 */
export const getBillByIdentifier = query({
  args: {
    congress: v.number(),
    billType: v.string(),
    billNumber: v.string(),
  },
  returns: v.union(v.object({
    _id: v.id("bills"),
    _creationTime: v.number(),
    congress: v.number(),
    billType: v.string(),
    billNumber: v.string(),
    title: v.string(),
    cleanedShortTitle: v.optional(v.string()),
    sponsorId: v.optional(v.id("politicians")),
    committees: v.optional(v.array(v.string())),
    latestVersionCode: v.optional(v.string()),
    latestActionDate: v.optional(v.string()),
    status: v.string(),
    tagline: v.optional(v.string()),
    summary: v.optional(v.string()),
    changeAnalysis: v.optional(v.any()),
    impactAreas: v.optional(v.array(v.string())),
  }), v.null()),
  handler: async (ctx, args) => {
    const bill = await ctx.db
      .query("bills")
      .withIndex("by_identifier", (q) =>
        q.eq("congress", args.congress)
         .eq("billType", args.billType)
         .eq("billNumber", args.billNumber)
      )
      .first();
    
    return bill;
  },
});

/**
 * Get full bill details with sponsor information
 */
export const getBillWithSponsor = query({
  args: { billId: v.id("bills") },
  returns: v.union(
    v.object({
      bill: v.object({
        _id: v.id("bills"),
        _creationTime: v.number(),
        congress: v.number(),
        billType: v.string(),
        billNumber: v.string(),
        title: v.string(),
        cleanedShortTitle: v.optional(v.string()),
        sponsorId: v.optional(v.id("politicians")),
        committees: v.optional(v.array(v.string())),
        latestVersionCode: v.optional(v.string()),
        latestActionDate: v.optional(v.string()),
        status: v.string(),
        tagline: v.optional(v.string()),
        summary: v.optional(v.string()),
        changeAnalysis: v.optional(v.any()),
        impactAreas: v.optional(v.array(v.string())),
      }),
      sponsor: v.union(
        v.object({
          _id: v.id("politicians"),
          _creationTime: v.number(),
          name: v.string(),
          govinfoId: v.optional(v.string()),
          party: v.string(),
          state: v.string(),
          chamber: v.union(v.literal("House"), v.literal("Senate")),
        }),
        v.null()
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.billId);
    if (!bill) return null;

    let sponsor = null;
    if (bill.sponsorId) {
      sponsor = await ctx.db.get(bill.sponsorId);
    }

    return { bill, sponsor };
  },
});

// ================================
// BILL VERSIONS
// ================================

/**
 * Get all versions of a bill
 */
export const getBillVersions = query({
  args: { billId: v.id("bills") },
  returns: v.array(v.object({
    _id: v.id("billVersions"),
    _creationTime: v.number(),
    billId: v.id("bills"),
    versionCode: v.string(),
    title: v.string(),
    publishedDate: v.string(),
    xmlUrl: v.string(),
  })),
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query("billVersions")
      .withIndex("by_billId_and_version", (q) => q.eq("billId", args.billId))
      .collect();

    // Return without fullText for performance (use getBillVersionText for full text)
    return versions.map(v => ({
      _id: v._id,
      _creationTime: v._creationTime,
      billId: v.billId,
      versionCode: v.versionCode,
      title: v.title,
      publishedDate: v.publishedDate,
      xmlUrl: v.xmlUrl,
    }));
  },
});

/**
 * Get the full text of a specific bill version
 */
export const getBillVersionText = query({
  args: { versionId: v.id("billVersions") },
  returns: v.union(v.object({
    _id: v.id("billVersions"),
    _creationTime: v.number(),
    billId: v.id("bills"),
    versionCode: v.string(),
    title: v.string(),
    publishedDate: v.string(),
    fullText: v.string(),
    xmlUrl: v.string(),
  }), v.null()),
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    return version;
  },
});

/**
 * Get the latest version of a bill with full text
 */
export const getLatestBillVersion = query({
  args: { billId: v.id("bills") },
  returns: v.union(v.object({
    _id: v.id("billVersions"),
    _creationTime: v.number(),
    billId: v.id("bills"),
    versionCode: v.string(),
    title: v.string(),
    publishedDate: v.string(),
    fullText: v.string(),
    xmlUrl: v.string(),
  }), v.null()),
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query("billVersions")
      .withIndex("by_billId_and_version", (q) => q.eq("billId", args.billId))
      .order("desc")
      .first();

    return versions;
  },
});

// ================================
// CHAT FUNCTIONALITY
// ================================

// Note: Bill chat functionality has been moved to convex/agent.ts
// Use the chatAboutBill action from the agent module instead

// ================================
// TEXT SEARCH WITHIN BILL
// ================================

/**
 * Search for specific terms within a bill's text
 */
export const searchBillText = query({
  args: {
    billId: v.id("bills"),
    searchTerm: v.string(),
  },
  returns: v.array(v.object({
    versionId: v.id("billVersions"),
    versionCode: v.string(),
    matches: v.array(v.object({
      excerpt: v.string(),
      position: v.number(),
    })),
  })),
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query("billVersions")
      .withIndex("by_billId_and_version", (q) => q.eq("billId", args.billId))
      .collect();

    const results = [];
    const searchTermLower = args.searchTerm.toLowerCase();

    for (const version of versions) {
      const matches = [];
      const textLower = version.fullText.toLowerCase();
      let position = 0;

      while (true) {
        const index = textLower.indexOf(searchTermLower, position);
        if (index === -1) break;

        // Extract excerpt around the match
        const start = Math.max(0, index - 100);
        const end = Math.min(version.fullText.length, index + args.searchTerm.length + 100);
        const excerpt = version.fullText.substring(start, end);

        matches.push({
          excerpt,
          position: index,
        });

        position = index + 1;
        
        // Limit to 10 matches per version to prevent overwhelming results
        if (matches.length >= 10) break;
      }

      if (matches.length > 0) {
        results.push({
          versionId: version._id,
          versionCode: version.versionCode,
          matches,
        });
      }
    }

    return results;
  },
});

// ================================
// BILL COMPARISON
// ================================

/**
 * Compare two versions of a bill
 */
export const compareBillVersions = query({
  args: {
    version1Id: v.id("billVersions"),
    version2Id: v.id("billVersions"),
  },
  returns: v.union(v.object({
    version1: v.object({
      _id: v.id("billVersions"),
      versionCode: v.string(),
      title: v.string(),
      publishedDate: v.string(),
      fullText: v.string(),
    }),
    version2: v.object({
      _id: v.id("billVersions"),
      versionCode: v.string(),
      title: v.string(),
      publishedDate: v.string(),
      fullText: v.string(),
    }),
  }), v.null()),
  handler: async (ctx, args) => {
    const [version1, version2] = await Promise.all([
      ctx.db.get(args.version1Id),
      ctx.db.get(args.version2Id),
    ]);

    if (!version1 || !version2) return null;

    return {
      version1: {
        _id: version1._id,
        versionCode: version1.versionCode,
        title: version1.title,
        publishedDate: version1.publishedDate,
        fullText: version1.fullText,
      },
      version2: {
        _id: version2._id,
        versionCode: version2.versionCode,
        title: version2.title,
        publishedDate: version2.publishedDate,
        fullText: version2.fullText,
      },
    };
  },
});

// ================================
// COSPONSORS AND COMMITTEES
// ================================

/**
 * Get politicians by committee
 */
export const getPoliticiansByCommittee = query({
  args: { committee: v.string() },
  returns: v.array(v.object({
    _id: v.id("politicians"),
    name: v.string(),
    party: v.string(),
    state: v.string(),
    chamber: v.union(v.literal("House"), v.literal("Senate")),
  })),
  handler: async () => {
    // Note: This would require additional schema changes to track committee memberships
    // For now, we'll return an empty array as this functionality would need
    // additional data modeling for politician-committee relationships
    return [];
  },
});

/**
 * Get bills by the same sponsor
 */
export const getBillsBySponsor = query({
  args: {
    sponsorId: v.id("politicians"),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("bills"),
    congress: v.number(),
    billType: v.string(),
    billNumber: v.string(),
    title: v.string(),
    status: v.string(),
    tagline: v.optional(v.string()),
    latestActionDate: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const bills = await ctx.db
      .query("bills")
      .withIndex("by_sponsorId", (q) => q.eq("sponsorId", args.sponsorId))
      .order("desc")
      .take(args.limit || 10);

    return bills.map(bill => ({
      _id: bill._id,
      congress: bill.congress,
      billType: bill.billType,
      billNumber: bill.billNumber,
      title: bill.title,
      status: bill.status,
      tagline: bill.tagline,
      latestActionDate: bill.latestActionDate,
    }));
  },
});

// ================================
// CITATION NAVIGATION
// ================================

/**
 * Get specific sections of bill text by sectionId across all versions of a bill
 */
export const getBillSection = query({
  args: {
    billId: v.id("bills"),
    sectionId: v.string(),
  },
  returns: v.union(v.object({
    content: v.string(),
    startPosition: v.number(),
    endPosition: v.number(),
    versionId: v.id("billVersions"),
    versionCode: v.string(),
  }), v.null()),
  handler: async (ctx, args) => {
    // Get all versions of the bill
    const versions = await ctx.db
      .query("billVersions")
      .withIndex("by_billId_and_version", (q) => q.eq("billId", args.billId))
      .collect();

    // Search through versions for the section
    for (const version of versions) {
      const fullText = version.fullText;
      let startPosition = 0;
      let endPosition = fullText.length;

      // Try to find the section by common patterns
      const sectionPatterns = [
        new RegExp(`SEC\\. ${args.sectionId}\\b`, 'i'),
        new RegExp(`Section ${args.sectionId}\\b`, 'i'),
        new RegExp(`\\(${args.sectionId}\\)`, 'i'),
      ];

      for (const pattern of sectionPatterns) {
        const match = fullText.search(pattern);
        if (match !== -1) {
          startPosition = match;
          // Find the next section or end of text
          const nextSectionMatch = fullText.substring(match + 1).search(/SEC\. \d+|Section \d+/i);
          if (nextSectionMatch !== -1) {
            endPosition = match + 1 + nextSectionMatch;
          }
          
          return {
            content: fullText.substring(startPosition, endPosition),
            startPosition,
            endPosition,
            versionId: version._id,
            versionCode: version.versionCode,
          };
        }
      }
    }

    return null;
  },
});

/**
 * Get specific sections of bill text by line numbers for a specific version
 */
export const getBillSectionByLines = query({
  args: {
    versionId: v.id("billVersions"),
    startLine: v.number(),
    endLine: v.optional(v.number()),
  },
  returns: v.union(v.object({
    content: v.string(),
    startPosition: v.number(),
    endPosition: v.number(),
  }), v.null()),
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version) return null;

    const fullText = version.fullText;
    const lines = fullText.split('\n');
    
    if (args.startLine >= lines.length) return null;
    
    const startPosition = lines.slice(0, args.startLine).join('\n').length + (args.startLine > 0 ? 1 : 0);
    
    let endPosition = fullText.length;
    if (args.endLine !== undefined && args.endLine < lines.length) {
      endPosition = lines.slice(0, args.endLine + 1).join('\n').length;
    }

    return {
      content: fullText.substring(startPosition, endPosition),
      startPosition,
      endPosition,
    };
  },
});
