
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