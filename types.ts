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