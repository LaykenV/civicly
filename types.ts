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