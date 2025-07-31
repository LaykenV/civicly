// Helper function to recursively extract text from the complex body structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
/*export const extractTextRecursively = (node: any): string => {
    if (typeof node === 'string') {
      return node + " ";
    }
    if (node === null || typeof node !== 'object') {
      return "";
    }
  
    let text = "";
    if (node["#text"]) {
      text += node["#text"] + " ";
    }
  
    for (const key in node) {
      if (key !== "#text" && key !== "@_display-inline") { // Ignore metadata/attributes
        if (Array.isArray(node[key])) {
          for (const item of node[key]) {
            text += extractTextRecursively(item);
          }
        } else if (typeof node[key] === 'object') {
          text += extractTextRecursively(node[key]);
        }
      }
    }
    return text;
  };*/

  /**
 * Recursively extracts meaningful text from a parsed XML node representing a bill.
 * This function is specifically designed to traverse the legislative XML structure,
 * concatenating text from meaningful tags while ignoring structural/metadata tags
 * like <enum> and <header>.
 *
 * @param node The current node from the fast-xml-parser output.
 * @returns A string of concatenated, cleaned text.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extractBillText = (node: any): string => {
    if (!node) {
      return "";
    }
  
    // If the node is just a string, return it.
    if (typeof node === 'string') {
      return node + " ";
    }
  
    let fullText = "";
  
    // The direct text content of a tag is usually in "#text".
    if (node["#text"]) {
      fullText += node["#text"] + " ";
    }
  
    // An ordered list of tags that contain the main legislative text.
    // We process them in this order to maintain a logical flow.
    const contentTags = [
      "text",
      "section",
      "subsection",
      "paragraph",
      "subparagraph",
      "clause",
      "subclause",
      "item",
      "quoted-block",
      "quote",
      "continuation-text",
    ];
  
    for (const tagName of contentTags) {
      if (node[tagName]) {
        // The tag's content could be a single object or an array of objects.
        const children = Array.isArray(node[tagName]) ? node[tagName] : [node[tagName]];
        for (const child of children) {
          fullText += extractBillText(child); // Recurse into the child
        }
      }
    }
  
    return fullText;
  };