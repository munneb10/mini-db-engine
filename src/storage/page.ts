import { PageId } from "./types";

export interface BTreeNodePage {
  id: PageId;
  isLeaf: boolean;
  keys: number[];
  // For internal nodes: children.length = keys.length + 1
  children: PageId[];
  // For leaf nodes: same length as keys
  values?: string[];
  // Linked list of leaves for range scan
  nextLeaf?: PageId | null;
}

/**
 * Encodes a BTreeNodePage into a fixed-size Buffer.
 * We simply JSON-serialize the node and pad with zeros.
 * This keeps the implementation simple but still teaches page-based storage.
 */
export function encodePage(node: BTreeNodePage, pageSize: number): Buffer {
  const json = JSON.stringify(node);
  const data = Buffer.from(json, "utf8");

  if (data.length > pageSize) {
    throw new Error(
      `Page overflow: serialized node size ${data.length} > pageSize ${pageSize}`
    );
  }

  const buffer = Buffer.alloc(pageSize);
  data.copy(buffer);
  return buffer;
}

/**
 * Decodes a Buffer back into a BTreeNodePage.
 * Trims trailing zero bytes before parsing JSON.
 */
export function decodePage(buffer: Buffer): BTreeNodePage {
  const json = buffer.toString("utf8").replace(/\0+$/g, "");
  if (!json.trim()) {
    throw new Error("Attempted to decode an empty page.");
  }
  return JSON.parse(json) as BTreeNodePage;
}
