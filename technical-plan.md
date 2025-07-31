# **Technical Architecture & Plan: Civicly (Updated)**

This document outlines the technical architecture for the Civicly application. It has been updated to reflect discoveries from initial API testing, providing a more robust and realistic plan for the data engine, backend processes, and database schema.

### **1. Overall Architecture: A High-Level View**

Your choice of **Next.js + Convex** is outstanding for this application. Here's why it's the right call:

- **Real-time by Default:** Convex's reactive query system means your UI (bill statuses, notifications, chat) will update instantly without complex state management or polling. This is a huge win for user experience.
- **Integrated AI & Vector Search:** You're building an AI-native app. Convex's Agent, RAG, and Vector search components are not add-ons; they are first-class citizens. This dramatically simplifies building your core features like the chat and "Analyze Impact" functions.
- **Serverless & Scalable:** You don't have to think about managing servers, databases, or scaling infrastructure. As your user base grows or your data pipeline gets heavier, Convex handles it.
- **Unified Backend:** Writing your entire backend—data pipelines, API endpoints, real-time logic—in TypeScript within a single project is a massive developer productivity boost.

**Architectural Diagram:**

Generated code

`+------------------+      +----------------------+      +--------------------+
|   User (Browser) |----->|  Next.js Frontend    |----->|   Convex Backend   |
+------------------+      | (React, App Router)  |      | (TypeScript)       |
                        | - Bill/Politician Pages|      | - Auth (Clerk)     |
                        | - Interactive Summary  |      | - Database         |
                        | - Smart Searchbar      |      | - AI Agent/RAG     |
                        | - User Settings        |      | - Workflows/Crons  |
                        +----------------------+      | - Polar (Payments) |
                                |                     | - Resend (Emails)  |
                                |                     +---------+----------+
                                |                               |
                                v                               v
+------------------+      +----------------------+      +--------------------+
|  B2B User (API)  |<-----| Convex HTTP Actions  |<-----|  External APIs     |
+------------------+      | (Monetized API)      |      | - Govinfo.gov (Bulk)|
                        +----------------------+      | - ProPublica       |
                                                      | - OpenSecrets      |
                                                      +--------------------+`

Use code [**with caution**](https://support.google.com/legal/answer/13505487).

---

### **2. The Data Engine: The Heart of the Application (Revised)**

This is the most critical part of the system. Initial exploration revealed that govinfo.gov provides data in a **two-step process**: first, a JSON **manifest** listing available files, and second, the individual **XML files** containing the rich, structured bill text. Our data engine must reflect this reality. We will use the **@convex-dev/workflow** component to build a durable, observable, and retry-able data pipeline.

The process is split into a discovery action and a processing workflow.

**A. Cron Job & Discovery (@convex-dev/crons)**

- A cron job runs periodically (e.g., every 4-6 hours).
- It triggers a Convex action: discoverNewBillFiles.

**Action: discoverNewBillFiles**

1. **Fetch Manifests:** Call the govinfo.gov bulk data JSON endpoints for each collection (e.g., BILLS/119/1/hconres, BILLS/119/1/hr, etc.).
2. **Check Timestamp:** Retrieve the lastCheckTimestamp from a dedicated table or KV store.
3. **Identify New Files:** Filter the files array in each manifest to find all XML files where formattedLastModifiedTime is more recent than lastCheckTimestamp.
4. **Dispatch Workflows:** For each new/updated file URL, kick off the ingestAndEnrichBillFile workflow, passing the file URL as an argument.
5. **Update Timestamp:** After dispatching, update the lastCheckTimestamp to the current time.

**B. Workflow: ingestAndEnrichBillFile(xmlUrl)**

This workflow processes a single bill version (one XML file).

1. **Step 1: Fetch and Parse (Action)**
    - **Input:** The xmlUrl of a specific bill version.
    - **Action:**
        - Fetch the raw XML content from the URL.
        - Use a reliable XML parsing library (e.g., fast-xml-parser) to convert it to a JavaScript object.
        - **Programmatically extract structured metadata**: billNumber, officialTitle, shortTitle, versionCode (e.g., "ih", "eh", "enr"), sponsor (including their name-id), cosponsors, actionDate, committee.
        - Cleanly extract the full text of the bill from the structured XML.
    - **Output:** A structured object: { metadata: { ... }, fullText: "..." }.
2. **Step 2: AI Summarization & Tagline (Action)**
    - **Input:** The { metadata, fullText } object from Step 1.
    - **Action:** Use the **Convex Agent** with the fullText and a carefully crafted prompt to generate:
        1. A detailed, section-by-section summary.
        2. A one-sentence tagline.
        3. A list of impactAreas (e.g., "Healthcare", "Technology", "Environment").
    - **Output:** Structured JSON: { summary, tagline, impactAreas }.
3. **Step 3: Vectorize Bill Text for RAG (Action)**
    - **Input:** The fullText and the bill's unique identifier (billId + versionCode).
    - **Action:** Use the **@convex-dev/rag component's add function**. Provide the fullText. The component handles chunking and embedding. Use a unique namespace for each bill to keep its context isolated (e.g., bill_H.R.4350).
    - **Output:** The entryId from the RAG component for this text.
4. **Step 4: Analyze "Current Law vs. Proposed Change" (Action - *Future Enhancement*)**
    - This remains a sophisticated, high-value step for a later phase. The process is unchanged: parse the bill for references, fetch the current law, and use an AI prompt to compare them.
5. **Step 5: Finalize and Publish (Mutation)**
    - **Input:** All enriched data from the previous steps.
    - **Action (Atomic Mutation):**
        - Use the billNumber from the parsed metadata to query for a parent document in the bills table. If it doesn't exist, create it with basic info.
        - Create a **new document** in the billVersions table, storing the versionCode, fullText, xmlUrl, and a link (billId) back to the parent bills document.
        - **Update the parent bills document**: Set its latestVersionCode, status (derived from the version code), summary, and tagline to reflect the data from this newest version.
        - Trigger notifications by querying the notifications table for users following this bill, its sponsor, or its topics, and schedule emails/texts via the **@convex-dev/resend** component.

---

### **3. Detailed Database Schema (convex/schema.ts) (Revised)**

This schema is updated to model the relationship between a bill "concept" and its various versions.

Generated typescript

`import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { vThreadId } from "@convex-dev/agent"; // From agent component

export default defineSchema({
  // --- Core Legislative Tables ---

  // Represents the *concept* of a bill, holding the latest summary and status.
  bills: defineTable({
    // Identifier fields
    congress: v.number(),          // e.g., 119
    billType: v.string(),          // e.g., "hconres", "hr", "s"
    billNumber: v.string(),        // e.g., "10"
    // Core, relatively static info
    title: v.string(),
    sponsorId: v.optional(v.id("politicians")),
    // Fields that reflect the LATEST ingested version
    latestVersionCode: v.optional(v.string()), // "ih", "rh", "enr"
    status: v.string(), // "Introduced", "Passed House", "Enrolled"
    tagline: v.optional(v.string()), // AI-generated
    summary: v.optional(v.string()), // AI-generated summary of the latest version
    changeAnalysis: v.optional(v.any()), // For "Current vs. Proposed"
    impactAreas: v.optional(v.array(v.string())), // ["Finance", "Healthcare"]
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
    .index("by_billId_and_version", ["billId", "versionCode"]),

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

  // --- User-related Tables (Unchanged) ---
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

  // --- AI & Interaction Tables (Unchanged) ---
  chats: defineTable({
    userId: v.id("users"),
    billId: v.optional(v.id("bills")),
    threadId: vThreadId,
  })
    .index("by_user_bill", ["userId", "billId"])
    .index("by_threadId", ["threadId"]),

  // --- System & Component Tables (Unchanged) ---
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
  })
  
  // Tables from components (agent, rag, etc.) will be added automatically.
});`

Use code [**with caution**](https://support.google.com/legal/answer/13505487).TypeScript

---

### **4. Backend Logic & Convex Functions**

- **Chat (/chat)**:
    - startChat(billId?): A mutation that creates a new thread using agent.createThread() and links it in our chats table.
    - sendMessage(threadId, prompt): An action.
        1. It uses agent.continueThread() to get thread context.
        2. It uses the **@convex-dev/rag component's search** function against the vectorized text of the **latest version** of the relevant bill to find context chunks.
        3. It injects this context into the prompt for the **agent.streamText()** or **agent.generateText()** call (Tool-based RAG).
        4. The agent generates a response, citing sources from the context provided.
- **"Analyze Impact on Me" (/proFeatures)**:
    - This action takes a billId.
    - It fetches the user's profileData and the bill's latest AI summary.
    - It constructs a highly-specific prompt for the **Agent**: *"Given this user profile (Location: X, Occupation: Y) and this legislative bill (Summary: ...), analyze the potential impacts..."*
- **Authentication (/auth)**: Leverage **@convex-dev/auth** (using Clerk).
- **Payments (/payments)**: Use the **@convex-dev/polar** component for subscriptions.

---

### **5. Frontend Architecture & SEO**

- **Next.js App Router**: This is the correct choice.
- **Data Fetching Strategy**:
    - **Bill Pages (/bills/[billId])**: These must be generated using **Incremental Static Regeneration (ISR)** for SEO.
        - The page will fetch the latest summary from the bills table and can also fetch the history of versions from the billVersions table to display a timeline.
        - When the data pipeline's "Finalize and Publish" step runs, it must trigger a revalidateTag or revalidatePath webhook in Next.js to regenerate the static page with the new data.
    - **Politician Pages**: Same ISR strategy.
    - **Homepage & Interactive Elements**: Use client components with Convex hooks (useQuery, useMutation, useAction).
- **Smart Searchbar**:
    - A client component fires a Convex action universalSearch(queryText).
    - This action performs parallel queries: a full-text search on the bills table's search_title index, a query on the politicians table, and potentially a natural language query to the Agent.
    - The action returns a structured object { bills: [...], politicians: [...], answer: "..." } for rendering.

---

### **6. API Monetization Strategy**

The plan for a B2B API remains a strong growth vector and is unchanged. It will serve the cleaned, enriched data from the bills table via authenticated and rate-limited Convex HTTP actions.

---

### **7. Phased Technical Rollout (Aligned with your MVP)**

- **Phase 1: The Core Utility**
    - **Tech Priority:** Build the **revised Data Engine (Discovery Action + Processing Workflow)**. This is the foundation. Get the pipeline for govinfo.gov XML files running reliably.
    - Implement the bills, billVersions, and politicians schemas.
    - Build the Next.js frontend with **ISR** for public, read-only Bill Pages.
    - Implement the universalSearch action and the smart search bar UI.
- **Phase 2: The Interactive Layer**
    - **Tech Priority:** Integrate **Convex Auth** and the users schema.
    - Build the interactive 2-pane Bill Page UI.
    - Implement the **Agent** and **RAG** components for the chat feature.
    - Implement the notifications schema and **Resend** integration.
- **Phase 3: The Profitability Layer**
    - **Tech Priority:** Integrate the **Polar** component for subscriptions.
    - Gate features like unlimited prompts and "Analyze Impact on Me".
    - Build out the user profile/settings page.
    - Implement the userVotes table and logic.
    - Build out the B2B API infrastructure.