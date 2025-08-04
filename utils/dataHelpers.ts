import { XMLParser } from "fast-xml-parser";
import { BillUrlInfo, ExtractedBillData, BillSponsor } from "../types";

/**
 * Recursively and universally extracts meaningful text from any node parsed by fast-xml-parser.
 * This function traverses the entire object tree, concatenating text from all nodes
 * while ignoring known structural/metadata tags (like <enum>, <header>) and attributes.
 *
 * @param node The current node from the fast-xml-parser output. Can be an object, array, string, or number.
 * @returns A string of concatenated, cleaned text.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extractBillText = (node: any): string => {
  // Base case: Node is null or undefined
  if (node === null || node === undefined) {
    return "";
  }

  // Base case: Node is a primitive value (string, number, boolean).
  // This handles simple text nodes and values from `parseTagValue: true`.
  if (typeof node !== 'object') {
    const text = String(node).trim();
    // Skip empty strings and meaningless single characters
    if (text.length === 0 || /^[.,;:\-_\s]*$/.test(text)) {
      return "";
    }
    return text + " ";
  }

  // Recursive case: Node is an array of sub-nodes.
  // Process each item in the array and join the results.
  if (Array.isArray(node)) {
    // Join with an empty string, as each recursive call adds its own space.
    return node.map(item => extractBillText(item)).join('');
  }

  // Recursive case: Node is an object.
  // This is the core logic for traversing the parsed XML structure.
  let fullText = "";
  
  // An expanded blacklist of keys that represent metadata, not textual content.
  const structuralTagsToIgnore = [
    'enum', 'header', 'label', 'toc', 'pagebreak', 
    'continuation-text', 'footnote-ref', 'xref',
    'target', 'graphic', 'table-column-spec'
  ];

  // Iterate over all keys in the object in their natural order.
  for (const key in node) {
    // Ignore attributes, which you've configured to start with '@_'.
    if (key.startsWith('@_')) {
      continue;
    }
    // Ignore specific structural tags from our blacklist.
    if (structuralTagsToIgnore.includes(key)) {
      continue;
    }
    
    // Recurse for all other keys (including '#text', 'section', 'quoted-block', etc.)
    fullText += extractBillText(node[key]);
  }
  
  return fullText;
};

/**
 * Parses bill information from a GovInfo XML URL
 * @param xmlUrl - The XML URL to parse
 * @returns Object containing congress, billType, billNumber, and versionCode
 */
export const parseBillInfoFromUrl = (xmlUrl: string): BillUrlInfo => {
  const urlMatch = xmlUrl.match(/BILLS-(\d{3})([a-zA-Z]+)(\d+)([a-zA-Z]{2,3})\.xml$/);
  if (!urlMatch) {
    throw new Error(`Could not parse bill info from URL: ${xmlUrl}`);
  }
  
  const [, congress, billType, billNumber, versionCode] = urlMatch;
  return {
    congress: parseInt(congress),
    billType,
    billNumber,
    versionCode
  };
};

/**
 * Determines version priority for bill versions (higher number = more important)
 * @param versionCode - The version code to evaluate
 * @returns Priority number (-1 for unknown versions)
 */
export const getVersionPriority = (versionCode: string): number => {
  const versionPriority = ["ih", "pcs", "rh", "eh", "enr"]; // Introduced -> Enrolled
  const index = versionPriority.indexOf(versionCode);
  return index === -1 ? -1 : index; // Unknown versions get lowest priority
};

/**
 * Configuration for the XML parser
 */
export const getXMLParserConfig = () => ({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  ignoreDeclaration: true,
  ignorePiTags: true,
  parseTagValue: true,
  isArray: (tagName: string) => [
    "cosponsor", "committee-name", "section", "subsection",
    "paragraph", "subparagraph", "clause", "subclause", "item"
  ].includes(tagName),
});

/**
 * Extracts bill type from chamber and resolution type
 * @param chamber - S or H
 * @param resolutionType - The resolution type (could be undefined for simple bills)
 * @returns The normalized bill type
 */
export const constructBillType = (chamber: string, resolutionType?: string): string => {
  if (!resolutionType) {
    // Simple bill: S -> s, H -> hr
    return chamber.toLowerCase() === 's' ? 's' : 'hr';
  } else {
    // Resolution: combine chamber and resolution type
    return (chamber + resolutionType)
      .toLowerCase()
      .replace(/\s/g, '')
      .replace(/\./g, '');
  }
};

/**
 * Extracts sponsor information from bill data
 * @param billData - The parsed bill data
 * @returns Sponsor object with name and nameId
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extractSponsorInfo = (billData: any): { sponsor: BillSponsor; introAction: any } => {
  const actions = Array.isArray(billData.form.action) ? billData.form.action : [billData.form.action].filter(Boolean);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const introAction = actions.find((a: any) => a?.["action-desc"]?.sponsor);
  
  let sponsor: BillSponsor = { name: "N/A", nameId: undefined };
  if (introAction?.["action-desc"]?.sponsor) {
    const sponsorNode = introAction["action-desc"].sponsor;
    sponsor = {
      name: sponsorNode["#text"],
      nameId: sponsorNode["@_name-id"],
    };
  }

  return { sponsor, introAction };
};

/**
 * Extracts cosponsor information from intro action
 * @param introAction - The introduction action containing cosponsor data
 * @returns Array of cosponsor objects
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extractCosponsors = (introAction: any): BillSponsor[] => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (introAction?.["action-desc"]?.cosponsor || []).map((node: any): BillSponsor => ({
    name: node["#text"],
    nameId: node["@_name-id"],
  }));
};

/**
 * Extracts committee information from intro action
 * @param introAction - The introduction action containing committee data
 * @returns Array of committee names
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extractCommittees = (introAction: any): string[] => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (introAction?.["action-desc"]?.["committee-name"] || []).map((node: any) => node["#text"]);
};

/**
 * Extracts and cleans short title from bill text
 * @param fullText - The full bill text
 * @param existingShortTitle - Any short title already found
 * @returns Cleaned short title or undefined
 */
export const extractAndCleanShortTitle = (fullText: string, existingShortTitle?: string): string | undefined => {
  const shortTitle = existingShortTitle || (() => {
    const shortTitleMatch = fullText.match(/This Act may be cited as the [""]([^"""]+)[""]|This Act may be cited as the ([^.]+)\./i);
    return shortTitleMatch ? (shortTitleMatch[1] || shortTitleMatch[2]) : undefined;
  })();

  return shortTitle
    ? shortTitle.replace(/This Act may be cited as the\s*\.?$/i, '').replace(/[""]$/, '').trim() 
    : undefined;
};

/**
 * Parses bill XML data and extracts structured information
 * @param xmlData - Raw XML string data
 * @param xmlUrl - The source URL for reference
 * @returns Structured bill data object
 */
export const parseBillXMLData = (xmlData: string, xmlUrl: string): ExtractedBillData => {
  const parser = new XMLParser(getXMLParserConfig());
  const jsonData = parser.parse(xmlData);
  
  const billData = jsonData.bill ?? jsonData.resolution;
  if (!billData) {
    throw new Error(`No 'bill' or 'resolution' root element found in ${xmlUrl}`);
  }

  // Extract basic bill identifier information
  const legisNum = billData.form["legis-num"]["#text"] || billData.form["legis-num"];
  const congressText = billData.form.congress["#text"] || billData.form.congress;
  const congress = parseInt(congressText.match(/(\d+)/)?.[1] || congressText);
  
  // Parse bill number and type
  const billParts = legisNum.match(/(S|H)\.?\s*(?:(J\.?\s*RES\.?|CON\.?\s*RES\.?|RES\.?|R\.?)\s*)?(\d+)/i);
  if (!billParts) {
    throw new Error(`Could not parse bill number/type from legis-num: "${legisNum}" in ${xmlUrl}`);
  }
  
  const chamber = billParts[1]; // S or H
  const resolutionType = billParts[2] || ''; // Could be undefined for simple bills
  const billNumber = billParts[3];
  const billType = constructBillType(chamber, resolutionType);

  // Extract titles
  const officialTitle = extractBillText(billData.form["official-title"]).trim() || "No official title.";
  const firstSection = billData["legis-body"]?.section?.[0];
  const shortTitle = firstSection?.header === "Short title" ? extractBillText(firstSection.text).trim() : undefined;

  // Extract version code from URL
  const versionCodeMatch = xmlUrl.match(/BILLS-\d{3}[a-zA-Z]+\d+([a-zA-Z]{2,3})\.xml$/);
  const versionCode = versionCodeMatch ? versionCodeMatch[1] : 'unknown';

  // Extract sponsor and related info
  const { sponsor, introAction } = extractSponsorInfo(billData);
  const cosponsors = extractCosponsors(introAction);
  const committees = extractCommittees(introAction);

  // Extract dates
  const actionDate = introAction?.["action-date"]?.["@_date"] ?? 
                    billData.form["action-date"]?.["@_date"] ?? 
                    billData.form["attestation-group"]?.["attestation-date"]?.["@_date"];

  // Extract full text
  const legisBody = billData["legis-body"] ?? billData["resolution-body"];
  const fullText = extractBillText(legisBody).replace(/\s+/g, ' ').trim();

  // Clean up short title
  const cleanedShortTitle = extractAndCleanShortTitle(fullText, shortTitle);

  return {
    congress,
    billType,
    billNumber,
    versionCode,
    officialTitle,
    cleanedShortTitle,
    sponsor,
    cosponsors,
    committees,
    actionDate,
    xmlUrl,
    fullText,
    summary: "",
    tagLine: "",
    impactAreas: [],
  };
};

/**
 * Maps Library of Congress version codes to human-readable bill statuses
 * Based on the official govinfo.gov version code system
 * Reference: https://www.govinfo.gov/help/bills
 * @param versionCode - The version code to map (e.g., "ih", "eh", "enr")
 * @returns Human-readable status string
 */
export const getBillStatusFromVersionCode = (versionCode: string): string => {
  // Map version codes to human-readable statuses
  const versionToStatus: Record<string, string> = {
    // Introduced versions
    'ih': 'Introduced in House',
    'is': 'Introduced in Senate',
    
    // Committee stages
    'rh': 'Reported in House',
    'rs': 'Reported in Senate', 
    'rch': 'Referred to Committee (House)',
    'rcs': 'Referred to Committee (Senate)',
    
    // Calendar/Floor stages
    'pch': 'Placed on Calendar (House)',
    'pcs': 'Placed on Calendar (Senate)',
    
    // Passed one chamber
    'eh': 'Passed House',
    'es': 'Passed Senate',
    'eah': 'Passed House (Amended)',
    'eas': 'Passed Senate (Amended)',
    
    // Final stages
    'enr': 'Enrolled (Sent to President)',
    'pl': 'Public Law',
    
    // Conference and other stages
    'cph': 'Conference Report (House)',
    'cps': 'Conference Report (Senate)',
    'pp': 'Public Print',
    'sc': 'Sponsor Changes',
    
    // Resolutions specific
    'ath': 'Agreed to (House)',
    'ats': 'Agreed to (Senate)',
  };
  
  // Return mapped status or a fallback with the version code
  return versionToStatus[versionCode.toLowerCase()] || `Status: ${versionCode.toUpperCase()}`;
};