/* eslint-disable @typescript-eslint/no-unused-vars */
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  
  // --- Core Legislative Tables ---
  
  // Represents the *concept* of a bill, holding the latest summary and status.
  bills: defineTable({
    // Identifier fields
    congress: v.number(),          // e.g., 119
    billType: v.string(),          // e.g., "hconres", "hr", "s"
    billNumber: v.string(),        // e.g., "10"
    // Core, relatively static info
    title: v.string(),
    cleanedShortTitle: v.optional(v.string()), // Short title from bill text
    sponsorId: v.optional(v.id("politicians")),
    committees: v.optional(v.array(v.string())), // Committees handling this bill
    // Fields that reflect the LATEST ingested version
    latestVersionCode: v.optional(v.string()), // "ih", "rh", "enr"
    latestActionDate: v.optional(v.string()), // Most recent action date
    status: v.string(), // "Introduced", "Passed House", "Enrolled"
    tagline: v.optional(v.string()), // AI-generated
    summary: v.optional(v.string()), // AI-generated summary of the latest version
    changeAnalysis: v.optional(v.any()), // For "Current vs. Proposed"
    impactAreas: v.optional(v.array(v.string())), // ["Finance", "Healthcare"]
    ragId: v.optional(v.string()), // RAG entry ID for tracking/debugging
  })
    // Unique identifier for a bill concept
    .index("by_identifier", ["congress", "billType", "billNumber"])
    .index("by_sponsorId", ["sponsorId"])
    .searchIndex("search_title", { searchField: "title" }),

  // NEW TABLE: Represents a specific version of a bill (e.g., an XML file).
  billVersions: defineTable({
    billId: v.id("bills"),         // Foreign key to the parent bill
    versionCode: v.string(),       // "ih", "rh", "enr", etc.
    title: v.string(),             // The title as it appeared in this version
    publishedDate: v.string(),
    fullText: v.string(),          // The full text of THIS version
    xmlUrl: v.string(),            // The source URL from govinfo.gov
  })
    .index("by_billId_and_version", ["billId", "versionCode"])
    .index("by_xmlUrl", ["xmlUrl"]),

  politicians: defineTable({
    name: v.string(),
    govinfoId: v.optional(v.string()), // e.g., "H001052" from XML. Key for linking.
    propublicaId: v.optional(v.string()),
    opensecretsId: v.optional(v.string()),
    party: v.string(),
    state: v.string(),
    chamber: v.union(v.literal("House"), v.literal("Senate")),
    // Campaign finance & voting history data stored here
  })
    .index("by_name", ["name"])
    .index("by_govinfoId", ["govinfoId"]),

  // --- User-related Tables ---
  userProfiles: defineTable({
    name: v.string(),
    email: v.string(),
    // Polar Customer ID will be managed by the Polar component
    profileData: v.optional(v.object({
        location: v.optional(v.string()),
        occupation: v.optional(v.string()),
        interests: v.optional(v.array(v.string())),
        // ...other fields for "Analyze Impact"
      })
    ),
  }).index("by_email", ["email"]),

  userVotes: defineTable({
    userId: v.id("users"),
    billId: v.id("bills"),
    vote: v.union(v.literal("yea"), v.literal("nay")),
  }).index("by_user_bill", ["userId", "billId"]),

  // --- AI & Interaction Tables ---
  chats: defineTable({
    userId: v.id("users"),
    billId: v.optional(v.id("bills")),
    threadId: v.string(), // String type for thread ID (compatible with agent)
  })
    .index("by_user_bill", ["userId", "billId"])
    .index("by_threadId", ["threadId"]),

  // --- System & Component Tables ---
  notifications: defineTable({
    userId: v.id("users"),
    targetType: v.union(v.literal("bill"), v.literal("politician"), v.literal("topic")),
    targetId: v.string(), // billId, politicianId, or topic name
  }).index("by_target", ["targetType", "targetId"]),

  apiKeys: defineTable({
    userId: v.id("users"),
    keyHash: v.string(),
    tier: v.string(),
    name: v.string(),
  }).index("by_keyHash", ["keyHash"]),

  lastCheckedTimestamp: defineTable({
    timestamp: v.number(),
  }),
  
});
