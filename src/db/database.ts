import { FileManager } from "../storage/fileManager";
import { BPlusTree } from "../index/bptree";

export class MiniDB {
  private readonly fileManager: FileManager;
  private readonly tree: BPlusTree;

  constructor(filePath: string) {
    this.fileManager = new FileManager(filePath);
    this.tree = new BPlusTree(this.fileManager, 4); // order=4 is small & visual
  }

  put(key: number, value: string): void {
    this.tree.insert(key, value);
  }

  get(key: number): string | null {
    return this.tree.search(key);
  }

  range(start: number, end: number): { key: number; value: string }[] {
    return this.tree.range(start, end);
  }

  close(): void {
    this.fileManager.close();
  }
}
