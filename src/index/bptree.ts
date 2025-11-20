import { FileManager } from "../storage/fileManager";
import { BTreeNodePage, encodePage, decodePage } from "../storage/page";
import { PageId } from "../storage/types";

interface InsertResult {
  promotedKey: number;
  rightPageId: PageId;
}

/**
 * Minimal B+ tree implementation:
 * - Leaf nodes store keys + values and are linked via nextLeaf
 * - Internal nodes store keys + child page IDs
 * - All nodes are stored as fixed-size pages via FileManager
 */
export class BPlusTree {
  private rootPageId: PageId;
  private readonly order: number; // max number of keys in a node
  private readonly fileManager: FileManager;

  constructor(fileManager: FileManager, order = 4) {
    if (order < 3) {
      throw new Error("Order must be at least 3.");
    }

    this.fileManager = fileManager;
    this.order = order;

    // For simplicity, always create a fresh root on startup.
    const root: BTreeNodePage = {
      id: this.fileManager.allocatePage(),
      isLeaf: true,
      keys: [],
      children: [],
      values: [],
      nextLeaf: null
    };

    this.writeNode(root);
    this.rootPageId = root.id;
  }

  // ---- Public API ----

  insert(key: number, value: string): void {
    const result = this.insertRecursive(this.rootPageId, key, value);

    if (result) {
      // Root split: create a new root
      const newRoot: BTreeNodePage = {
        id: this.fileManager.allocatePage(),
        isLeaf: false,
        keys: [result.promotedKey],
        children: [this.rootPageId, result.rightPageId],
        values: undefined,
        nextLeaf: null
      };

      this.writeNode(newRoot);
      this.rootPageId = newRoot.id;
    }
  }

  search(key: number): string | null {
    return this.searchRecursive(this.rootPageId, key);
  }

  /**
   * Range query [start, end] inclusive.
   * Uses leaf-level linked list for efficient scan.
   */
  range(start: number, end: number): { key: number; value: string }[] {
    const result: { key: number; value: string }[] = [];

    const leafId = this.findLeafForKey(this.rootPageId, start);
    let node = this.readNode(leafId);

    while (true) {
      if (!node.isLeaf || !node.values) break;

      for (let i = 0; i < node.keys.length; i++) {
        const k = node.keys[i];
        if (k > end) {
          return result;
        }
        if (k >= start) {
          result.push({ key: k, value: node.values[i] });
        }
      }

      if (node.nextLeaf == null) break;
      node = this.readNode(node.nextLeaf);
    }

    return result;
  }

  // ---- Internal helpers ----

  private readNode(id: PageId): BTreeNodePage {
    const buffer = this.fileManager.readPage(id);
    return decodePage(buffer);
  }

  private writeNode(node: BTreeNodePage): void {
    const buffer = encodePage(node, this.fileManager.getPageSize());
    this.fileManager.writePage(node.id, buffer);
  }

  private searchRecursive(nodeId: PageId, key: number): string | null {
    const node = this.readNode(nodeId);

    if (node.isLeaf) {
      if (!node.values) return null;
      const idx = node.keys.findIndex((k) => k === key);
      return idx === -1 ? null : node.values[idx];
    }

    // Internal node: pick child
    const childIndex = this.findChildIndex(node.keys, key);
    const childId = node.children[childIndex];
    return this.searchRecursive(childId, key);
  }

  private findChildIndex(keys: number[], key: number): number {
    // First index where key < keys[i]
    let i = 0;
    while (i < keys.length && key >= keys[i]) {
      i++;
    }
    return i;
  }

  private findLeafForKey(nodeId: PageId, key: number): PageId {
    let node = this.readNode(nodeId);

    while (!node.isLeaf) {
      const childIndex = this.findChildIndex(node.keys, key);
      const childId = node.children[childIndex];
      node = this.readNode(childId);
    }

    return node.id;
  }

  private insertRecursive(
    nodeId: PageId,
    key: number,
    value: string
  ): InsertResult | null {
    const node = this.readNode(nodeId);

    if (node.isLeaf) {
      return this.insertIntoLeaf(node, key, value);
    } else {
      return this.insertIntoInternal(node, key, value);
    }
  }

  private insertIntoLeaf(
    node: BTreeNodePage,
    key: number,
    value: string
  ): InsertResult | null {
    if (!node.values) {
      node.values = [];
    }

    // Insert key in sorted order
    let pos = 0;
    while (pos < node.keys.length && node.keys[pos] < key) {
      pos++;
    }

    // If key already exists, overwrite value
    if (pos < node.keys.length && node.keys[pos] === key) {
      node.values[pos] = value;
      this.writeNode(node);
      return null;
    }

    node.keys.splice(pos, 0, key);
    node.values.splice(pos, 0, value);

    // Check overflow
    if (node.keys.length > this.order) {
      return this.splitLeaf(node);
    } else {
      this.writeNode(node);
      return null;
    }
  }

  private splitLeaf(node: BTreeNodePage): InsertResult {
    if (!node.values) {
      throw new Error("Leaf node has no values array.");
    }

    const mid = Math.ceil(node.keys.length / 2);
    const rightKeys = node.keys.splice(mid);
    const rightValues = node.values.splice(mid);

    const rightNode: BTreeNodePage = {
      id: this.fileManager.allocatePage(),
      isLeaf: true,
      keys: rightKeys,
      children: [],
      values: rightValues,
      nextLeaf: node.nextLeaf ?? null
    };

    node.nextLeaf = rightNode.id;

    this.writeNode(node);
    this.writeNode(rightNode);

    const promotedKey = rightNode.keys[0];

    return {
      promotedKey,
      rightPageId: rightNode.id
    };
  }

  private insertIntoInternal(
    node: BTreeNodePage,
    key: number,
    value: string
  ): InsertResult | null {
    const childIndex = this.findChildIndex(node.keys, key);
    const childId = node.children[childIndex];

    const result = this.insertRecursive(childId, key, value);

    if (!result) {
      // Child did not split
      this.writeNode(node);
      return null;
    }

    // Child split: insert promoted key and new child pointer
    const { promotedKey, rightPageId } = result;

    let pos = 0;
    while (pos < node.keys.length && node.keys[pos] < promotedKey) {
      pos++;
    }

    node.keys.splice(pos, 0, promotedKey);
    node.children.splice(pos + 1, 0, rightPageId);

    if (node.keys.length > this.order) {
      return this.splitInternal(node);
    } else {
      this.writeNode(node);
      return null;
    }
  }

  private splitInternal(node: BTreeNodePage): InsertResult {
    const midIndex = Math.floor(node.keys.length / 2);
    const promotedKey = node.keys[midIndex];

    const leftKeys = node.keys.slice(0, midIndex);
    const rightKeys = node.keys.slice(midIndex + 1);

    const leftChildren = node.children.slice(0, midIndex + 1);
    const rightChildren = node.children.slice(midIndex + 1);

    // Left: reuse existing node page
    node.keys = leftKeys;
    node.children = leftChildren;

    const rightNode: BTreeNodePage = {
      id: this.fileManager.allocatePage(),
      isLeaf: false,
      keys: rightKeys,
      children: rightChildren,
      values: undefined,
      nextLeaf: null
    };

    this.writeNode(node);
    this.writeNode(rightNode);

    return {
      promotedKey,
      rightPageId: rightNode.id
    };
  }
}
