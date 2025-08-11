import { Agent } from "@convex-dev/agent";
import { RAG } from "@convex-dev/rag";
import { createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { components } from "./_generated/api";
import { action, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { BillSearchResponse, ChatResponse, GeneralChatResponse } from "../types";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize the RAG component for bill content search
export const rag = new RAG(components.rag, {
  filterNames: [
    "billIdentifier",
    "billType",
    "congress",
    "sponsor",
  ],
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});

// Initialize the Agent for bill analysis
export const billAnalysisAgent = new Agent(components.agent, {
  name: "Bill Analysis Agent",
  chat: google("gemini-2.5-flash"),
  instructions: `You are an expert legal and policy analyst specializing in U.S. federal legislation. 
Your role is to:
1. Analyze bills and provide clear, accurate summaries
2. Identify key impact areas and stakeholders
3. Create engaging one-sentence taglines that capture the essence of bills
4. Explain complex legislative language in accessible terms
5. Maintain political neutrality while highlighting important implications

Always be objective, factual, and cite specific sections when relevant.`,
  textEmbedding: openai.embedding("text-embedding-3-small"),
  maxSteps: 5, // Increased to allow multi-step tool usage
  maxRetries: 3,
  usageHandler: async (ctx, { model, usage }) => {
    console.log(`AI Usage - Model: ${model}, Tokens: ${JSON.stringify(usage)}`);
  },
});

// Helper query to get bill information
export const getBillInfo = internalQuery({
  args: { billId: v.id("bills") },
  returns: v.union(v.object({
    congress: v.number(),
    billType: v.string(),
    billNumber: v.string(),
    title: v.string(),
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
  }), v.null()),
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.billId);
    if (!bill) return null;
    
    return {
      congress: bill.congress,
      billType: bill.billType,
      billNumber: bill.billNumber,
      title: bill.title,
      structuredSummary: bill.structuredSummary,
    };
  },
});

// New helper to resolve Convex bill _id from identifier fields
export const getBillIdByIdentifier = internalQuery({
  args: {
    congress: v.number(),
    billType: v.string(),
    billNumber: v.string(),
  },
  returns: v.union(v.id("bills"), v.null()),
  handler: async (ctx, { congress, billType, billNumber }) => {
    const bill = await ctx.db
      .query("bills")
      .withIndex("by_identifier", (q) =>
        q.eq("congress", congress).eq("billType", billType).eq("billNumber", billNumber)
      )
      .first();
    return bill?._id ?? null;
  },
});

// Example search function that takes advantage of chunked data
export const searchBills = action({
  args: {
    query: v.string(),
    billType: v.optional(v.string()),
    congress: v.optional(v.string()),
    impactAreas: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    results: v.array(v.object({
      billId: v.string(),
      congress: v.number(),
      billType: v.string(),
      billNumber: v.string(),
      title: v.string(),
      tagline: v.optional(v.string()),
      sponsor: v.optional(v.object({
        name: v.string(),
        party: v.optional(v.string()),
        state: v.optional(v.string()),
      })),
      impactAreas: v.optional(v.array(v.string())),
      relevanceScore: v.number(),
      relevantChunks: v.number(),
      bestMatchText: v.string(),
    })),
    summary: v.string(),
    totalChunks: v.number(),
  }),
  handler: async (ctx, args): Promise<BillSearchResponse> => {
    // Build filters based on provided criteria
    const filters = [];
    if (args.billType) filters.push({ name: "billType", value: args.billType });
    if (args.congress) filters.push({ name: "congress", value: args.congress });
    // Note: impactAreas filtering disabled at index-time due to component filter slots; still available in metadata

    // Perform RAG search with chunked context
    const { results, entries } = await rag.search(ctx, {
      namespace: "bills",
      query: args.query,
      filters: filters.length > 0 ? filters : undefined,
      limit: args.limit || 20, // Increased limit to get more chunks before grouping
      vectorScoreThreshold: 0.35, // Slightly higher threshold for better quality
      chunkContext: { before: 1, after: 1 }, // Include surrounding chunks for better context
    });

    // Log the number of entries found
    console.log(`Found ${entries.length} entries for query: ${args.query}`, entries);

    // Helper function to parse sponsor information
    const parseSponsor = (sponsorText: string | undefined) => {
      if (!sponsorText) return undefined;
      
      // Try to extract name, party, and state from sponsor text
      // Format is usually "Rep. Name (Party-State)" or similar
      const match = sponsorText.match(/(?:Rep\.|Sen\.)?\s*([^\(]+)\s*\(([^-]+)-([^\)]+)\)/);
      if (match) {
        return {
          name: match[1].trim(),
          party: match[2].trim(),
          state: match[3].trim(),
        };
      }
      
      // Fallback to just the name if pattern doesn't match
      return {
        name: sponsorText.trim(),
      };
    };

    // Helper function to parse impact areas
    const parseImpactAreas = (impactText: string | undefined) => {
      if (!impactText) return undefined;
      return impactText.split(',').map(area => area.trim()).filter(area => area.length > 0);
    };

    // Group results by bill using entry metadata
    const billGroups = new Map<string, {
      entry: typeof entries[0];
      chunks: Array<{ score: number; content: string; relevantText: string }>;
    }>();

    results.forEach(result => {
      const entry = entries.find(e => e.entryId === result.entryId);
      if (!entry || !entry.metadata) return;
      
      const billIdentifier = entry.metadata.billIdentifier as string;
      const content = result.content.map(c => c.text).join('\n');
      const relevantText = content.slice(0, 500) + (content.length > 500 ? '...' : '');

      if (!billGroups.has(billIdentifier)) {
        billGroups.set(billIdentifier, {
          entry,
          chunks: []
        });
      }
      
      billGroups.get(billIdentifier)!.chunks.push({
        score: result.score,
        content,
        relevantText
      });
    });

    // Convert grouped results to final format using metadata and resolve Convex bill _id
    const processedResults = await Promise.all(
      Array.from(billGroups.values()).map(async (group) => {
        // Find the chunk with the highest score
        const bestChunk = group.chunks.reduce((best, current) => 
          current.score > best.score ? current : best
        );
        
        // Extract data directly from entry metadata
        const metadata = group.entry.metadata!;
        const congress = parseInt((metadata.congress as string) || '0');
        const billType = (metadata.billType as string) || 'Unknown';
        const billNumber = (metadata.billNumber as string) || 'Unknown';

        // Resolve Convex bill _id
        const convexBillId = await ctx.runQuery(internal.agent.getBillIdByIdentifier, {
          congress,
          billType,
          billNumber,
        });
        if (!convexBillId) {
          return null; // Skip results we can't route to
        }
        
        return {
          billId: convexBillId as string,
          congress,
          billType,
          billNumber,
          title: (metadata.cleanedShortTitle as string) || (metadata.officialTitle as string) || 'Unknown Title',
          tagline: (metadata.tagLine as string) || undefined,
          sponsor: parseSponsor(metadata.sponsorName as string),
          impactAreas: parseImpactAreas(metadata.impactAreas as string),
          relevanceScore: bestChunk.score,
          relevantChunks: group.chunks.length,
          bestMatchText: bestChunk.relevantText,
        };
      })
    );

    // Sort by relevance score (highest first)
    const filteredResults = processedResults.filter((r): r is NonNullable<typeof r> => r !== null);
    filteredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Take only the requested number of bills (not chunks)
    const limitedResults = filteredResults.slice(0, args.limit || 10);

    // Generate a summary of the search results
    const totalChunks = results.length;
    const totalBills = billGroups.size;
    const summary = totalBills > 0 
      ? `Found ${totalBills} relevant bill(s) for "${args.query}" across ${totalChunks} sections of legislative text.`
      : `No bills found matching "${args.query}" with the specified criteria.`;

    return {
      results: limitedResults,
      summary,
      totalChunks,
    };
  },
});

// Helper mutation to create and store chat threads
export const createChatThread = internalMutation({
  args: {
    userId: v.id("users"),
    billId: v.optional(v.id("bills")),
    title: v.optional(v.string()),
  },
  returns: v.object({
    chatId: v.id("chats"),
    threadId: v.string(),
  }),
  handler: async (ctx, args) => {
    // Create thread using agent
    const { threadId } = await billAnalysisAgent.createThread(ctx, {
      userId: args.userId,
      title: args.title,
    });
    
    // Store the thread association in our chats table
    const chatId = await ctx.db.insert("chats", {
      userId: args.userId,
      billId: args.billId,
      threadId,
    });
    
    return { chatId, threadId };
  },
});

// Helper query to get existing chat thread
export const getChatThread = internalQuery({
  args: {
    userId: v.id("users"),
    billId: v.optional(v.id("bills")),
  },
  returns: v.union(v.object({
    chatId: v.id("chats"),
    threadId: v.string(),
  }), v.null()),
  handler: async (ctx, args) => {
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_user_bill", (q) => 
        q.eq("userId", args.userId).eq("billId", args.billId)
      )
      .first();
    
    if (!chat) return null;
    
    return {
      chatId: chat._id,
      threadId: chat.threadId,
    };
  },
});

// Bill-specific chat function that leverages chunked content
export const chatAboutBill = action({
  args: {
    billId: v.id("bills"),
    question: v.string(),
  },
  returns: v.object({
    answer: v.string(),
    sources: v.array(v.string()),
    confidence: v.string(),
  }),
  handler: async (ctx, args): Promise<ChatResponse> => {
    // Get authenticated user
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Get bill information using the helper query
    const billInfo: { congress: number; billType: string; billNumber: string; title: string; } | null = await ctx.runQuery(internal.agent.getBillInfo, { billId: args.billId });
    if (!billInfo) {
      throw new Error("Bill not found");
    }
    
    // Get or create chat thread for this user-bill combination
    let threadInfo: { chatId: string; threadId: string; } | null = await ctx.runQuery(internal.agent.getChatThread, {
      userId: userId,
      billId: args.billId,
      });
    
    if (!threadInfo) {
      threadInfo = await ctx.runMutation(internal.agent.createChatThread, {
        userId: userId,
        billId: args.billId,
        title: `Chat about ${billInfo.billType.toUpperCase()} ${billInfo.billNumber}`,
      });
    }
    
    // Create bill identifier for precise filtering
    const billIdentifier = `${billInfo.congress}-${billInfo.billType}-${billInfo.billNumber}`;
    
    // Search for relevant chunks within this specific bill
    const { results, text } = await rag.search(ctx, {
      namespace: "bills",
      query: args.question,
      filters: [
        { name: "billIdentifier", value: billIdentifier }, // Use precise bill identifier
      ],
      limit: 8, // Increased for better coverage
      vectorScoreThreshold: 0.2, // Lower threshold for bill-specific search
      chunkContext: { before: 2, after: 1 }, // More context for detailed analysis
    });

    if (results.length === 0) {
      return {
        answer: `I couldn't find specific information about "${args.question}" in ${billInfo.billType.toUpperCase()} ${billInfo.billNumber}. You might want to rephrase your question or ask about a different aspect of the bill.`,
        sources: [],
        confidence: "low",
      };
    }

    // Continue the existing thread instead of creating a new one
    const { thread } = await billAnalysisAgent.continueThread(ctx, { 
      threadId: threadInfo.threadId,
      userId: userId,
    });
    
    const prompt = `You are analyzing ${billInfo.billType.toUpperCase()} ${billInfo.billNumber} titled "${billInfo.title}".

User Question: ${args.question}

Relevant Bill Content:
${text}

Please provide a clear, accurate answer to the user's question based on the bill content above. If the content doesn't fully address the question, say so. Always cite specific sections when relevant.`;

    const result = await thread.generateText({ prompt });

    // Extract sources (sections mentioned in the response)
    const sources = results
      .slice(0, 3) // Top 3 most relevant chunks
      .map((r, idx) => `Section ${idx + 1} (Score: ${r.score.toFixed(2)})`);

    // Determine confidence based on search results
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const confidence = avgScore > 0.7 ? "high" : avgScore > 0.4 ? "medium" : "low";

    return {
      answer: result.text,
      sources,
      confidence,
    };
  },
});

// General legislative chat that can search across all bills
export const generalLegislativeChat = action({
  args: {
    question: v.string(),
    context: v.optional(v.object({
      impactAreas: v.optional(v.array(v.string())),
      congress: v.optional(v.string()),
      billTypes: v.optional(v.array(v.string())),
    })),
  },
  returns: v.object({
    answer: v.string(),
    relevantBills: v.array(v.object({
      billType: v.string(),
      billNumber: v.string(),
      title: v.string(),
      relevance: v.string(),
    })),
    searchSummary: v.string(),
  }),
  handler: async (ctx, args): Promise<GeneralChatResponse> => {
    // Get authenticated user
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Get or create a general chat thread for this user
    let threadInfo: { chatId: string; threadId: string; } | null = await ctx.runQuery(internal.agent.getChatThread, {
      userId: userId,
      billId: undefined, // No specific bill for general chat
    });
    
    if (!threadInfo) {
      threadInfo = await ctx.runMutation(internal.agent.createChatThread, {
        userId: userId,
        billId: undefined,
        title: "General Legislative Chat",
      });
    }

    // Build filters from context
    const filters = [];
    if (args.context?.congress) {
      filters.push({ name: "congress", value: args.context.congress });
    }
    // Note: impactAreas filtering disabled at index-time due to component filter slots; still available in metadata
    if (args.context?.billTypes) {
      args.context.billTypes.forEach(type => {
        filters.push({ name: "billType", value: type });
      });
    }

    // Perform comprehensive search across all bills
    const { results, text } = await rag.search(ctx, {
      namespace: "bills",
      query: args.question,
      filters: filters.length > 0 ? filters : undefined,
      limit: 8,
      vectorScoreThreshold: 0.3,
      chunkContext: { before: 1, after: 1 },
    });

    if (results.length === 0) {
      return {
        answer: "I couldn't find any relevant legislation related to your question. You might want to try rephrasing your question or ask about a different topic.",
        relevantBills: [],
        searchSummary: "No relevant bills found.",
      };
    }

    // Continue the existing thread instead of creating a new one
    const { thread } = await billAnalysisAgent.continueThread(ctx, { 
      threadId: threadInfo.threadId,
      userId: userId,
    });
    
    const prompt = `You are a legislative analyst helping answer questions about federal legislation.

User Question: ${args.question}

Relevant Legislative Content from Multiple Bills:
${text}

Please provide a comprehensive answer that:
1. Directly addresses the user's question
2. Synthesizes information from the relevant bills mentioned above
3. Highlights key differences or similarities between bills if multiple are relevant
4. Maintains political neutrality
5. Cites specific bills when making claims

Format your response clearly and make it accessible to a general audience.`;

    const result = await thread.generateText({ prompt });

    // Extract bill information from the search results
    const billsMap = new Map<string, { type: string; number: string; title: string; chunks: number }>();
    
    results.forEach(result => {
      const content = result.content.map(c => c.text).join('\n');
      const typeMatch = content.match(/Type: ([A-Z]+) (\w+)/);
      const titleMatch = content.match(/Title: (.+)/);
      
      if (typeMatch && titleMatch) {
        const key = `${typeMatch[1]}-${typeMatch[2]}`;
        if (!billsMap.has(key)) {
          billsMap.set(key, {
            type: typeMatch[1],
            number: typeMatch[2],
            title: titleMatch[1].trim(),
            chunks: 0,
          });
        }
        billsMap.get(key)!.chunks++;
      }
    });

    const relevantBills = Array.from(billsMap.values()).map(bill => ({
      billType: bill.type,
      billNumber: bill.number,
      title: bill.title,
      relevance: `${bill.chunks} relevant section${bill.chunks > 1 ? 's' : ''}`,
    }));

    const searchSummary = `Found information across ${relevantBills.length} bill(s) in ${results.length} relevant sections.`;

    return {
      answer: result.text,
      relevantBills,
      searchSummary,
    };
  },
}); 