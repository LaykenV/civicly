import { Agent } from "@convex-dev/agent";
import { RAG } from "@convex-dev/rag";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";

// Initialize the RAG component for bill content search
export const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});

// Initialize the Agent for bill analysis
export const billAnalysisAgent = new Agent(components.agent, {
  name: "Bill Analysis Agent",
  chat: openai.chat("gpt-4o-mini"),
  instructions: `You are an expert legal and policy analyst specializing in U.S. federal legislation. 
Your role is to:
1. Analyze bills and provide clear, accurate summaries
2. Identify key impact areas and stakeholders
3. Create engaging one-sentence taglines that capture the essence of bills
4. Explain complex legislative language in accessible terms
5. Maintain political neutrality while highlighting important implications

Always be objective, factual, and cite specific sections when relevant.`,
  textEmbedding: openai.embedding("text-embedding-3-small"),
  maxSteps: 1,
  maxRetries: 3,
  usageHandler: async (ctx, { model, usage }) => {
    console.log(`AI Usage - Model: ${model}, Tokens: ${JSON.stringify(usage)}`);
  },
}); 