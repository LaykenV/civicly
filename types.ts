export interface BillFile {
  mimeType: string;
  size: number;
  formattedLastModifiedTime: string;
  name: string;
  folder: boolean;
  displayLabel: string;
  formattedSize: string;
  link: string;
  justFileName: string;
  fileExtension: string;
}

export interface BillData {
  files?: BillFile[];
  [key: string]: unknown; // Allow additional properties
}

export interface ApiResponse {
  data: BillData | string;
  responseType: 'json' | 'xml' | 'text';
  contentType: string;
  url: string;
}

// Core bill sponsor/cosponsor information
export interface BillSponsor {
  name: string;
  nameId?: string;
}

// Bill summary and AI-generated content
export interface BillSummaryData {
  summary: string;
  tagLine: string;
  impactAreas: string[];
  structuredSummary?: StructuredSummarySection[];
}

// Core extracted bill data structure
export interface ExtractedBillData {
  congress: number;
  billType: string;
  billNumber: string;
  versionCode: string;
  officialTitle: string;
  cleanedShortTitle?: string;
  sponsor: BillSponsor;
  cosponsors: BillSponsor[];
  committees: string[];
  actionDate?: string;
  xmlUrl: string;
  fullText: string;
  summary: string;
  tagLine: string;
  impactAreas: string[];
}

// Structured sectioned summary with citations
export interface StructuredSummaryCitation {
  label: string;       // e.g., "SEC. 101"
  sectionId: string;   // e.g., "101"
}

export interface StructuredSummarySection {
  title: string;       // section header
  text: string;        // section body
  citations?: StructuredSummaryCitation[];
}

// Parsed bill info from URL
export interface BillUrlInfo {
  congress: number;
  billType: string;
  billNumber: string;
  versionCode: string;
}

// Processing decision for bill versions
export interface ProcessDecision {
  shouldProcess: boolean;
  reason: string;
  existingBillId?: string; // This will be Id<"bills"> in Convex context
}

// NEW: Shared types for frontend-backend communication

// Database entity types (matches schema.ts)
export interface DbBill {
  _id: string; // Will be Id<"bills"> in Convex context
  _creationTime: number;
  congress: number;
  billType: string;
  billNumber: string;
  title: string;
  cleanedShortTitle?: string;
  sponsorId?: string; // Will be Id<"politicians"> in Convex context
  committees?: string[];
  latestVersionCode?: string;
  latestActionDate?: string;
  status: string;
  tagline?: string;
  summary?: string;
  impactAreas?: string[];
  structuredSummary?: StructuredSummarySection[];
}

export interface DbPolitician {
  _id: string; // Will be Id<"politicians"> in Convex context
  _creationTime: number;
  name: string;
  govinfoId?: string;
  propublicaId?: string;
  opensecretsId?: string;
  party: string;
  state: string;
  chamber: "House" | "Senate";
}

export interface DbBillVersion {
  _id: string; // Will be Id<"billVersions"> in Convex context
  _creationTime: number;
  billId: string; // Will be Id<"bills"> in Convex context
  versionCode: string;
  title: string;
  publishedDate: string;
  fullText: string;
  xmlUrl: string;
  textLength?: number;
}

// API response types
export interface BillSearchResult {
  billId: string; // Unique identifier for the bill
  congress: number;
  billType: string;
  billNumber: string;
  title: string;
  tagline?: string;
  sponsor?: {
    name: string;
    party?: string;
    state?: string;
  };
  impactAreas?: string[];
  relevanceScore: number; // Highest score from all chunks of this bill
  relevantChunks: number; // Number of relevant chunks found for this bill
  bestMatchText: string; // Text from the highest-scoring chunk
}

export interface BillSearchResponse {
  results: BillSearchResult[];
  summary: string;
  totalChunks: number; // Total number of chunks found across all bills
}

export interface ChatResponse {
  answer: string;
  sources: string[];
  confidence: "low" | "medium" | "high";
}

export interface GeneralChatResponse {
  answer: string;
  relevantBills: Array<{
    billType: string;
    billNumber: string;
    title: string;
    relevance: string;
  }>;
  searchSummary: string;
}

// Search filter types
export interface SearchFilters {
  billType?: string;
  congress?: string;
  impactAreas?: string[];
  sponsor?: string;
  limit?: number;
}

// Subset of ExtractedBillData for AI analysis (used in getBillSummary)
export interface BillAnalysisInput {
  fullText: string;
  billType: string;
  billNumber: string;
  versionCode: string;
  officialTitle: string;
  cleanedShortTitle?: string;
  sponsor: BillSponsor;
  cosponsors: BillSponsor[];
  committees: string[];
  actionDate?: string;
}

// Error types for the pipeline
export interface PipelineError {
  type: 'parsing' | 'network' | 'ai' | 'database' | 'validation';
  message: string;
  context?: Record<string, unknown>;
  timestamp: number;
} 