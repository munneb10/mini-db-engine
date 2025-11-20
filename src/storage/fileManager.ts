import * as fs from "fs";
import * as path from "path";
import { PageId } from "./types";

export class FileManager {
  private readonly filePath: string;
  private readonly pageSize: number;
  private fd: number;
  private nextPageId: PageId;

  constructor(filePath: string, pageSize = 4096) {
    this.filePath = path.resolve(filePath);
    this.pageSize = pageSize;

    const exists = fs.existsSync(this.filePath);

    if (!exists) {
      // Create a new file with read/write.
      this.fd = fs.openSync(this.filePath, "w+");
    } else {
      this.fd = fs.openSync(this.filePath, "r+");
    }

    const stats = fs.fstatSync(this.fd);
    const size = stats.size;

    if (size % this.pageSize !== 0) {
      // Not strictly necessary, but nice for sanity.
      throw new Error(
        `Corrupt data file: size ${size} is not a multiple of pageSize ${this.pageSize}`
      );
    }

    this.nextPageId = size / this.pageSize;
  }

  getPageSize(): number {
    return this.pageSize;
  }

  allocatePage(): PageId {
    const id = this.nextPageId++;
    const offset = id * this.pageSize;
    const empty = Buffer.alloc(this.pageSize);
    fs.writeFileSync(this.filePath, empty, {
      flag: "r+",
      encoding: null,
      mode: undefined
    });
    // Ensure data is written at correct offset
    fs.writeSync(this.fd, empty, 0, this.pageSize, offset);
    return id;
  }

  readPage(id: PageId): Buffer {
    const buffer = Buffer.alloc(this.pageSize);
    const offset = id * this.pageSize;
    const bytesRead = fs.readSync(this.fd, buffer, 0, this.pageSize, offset);

    if (bytesRead === 0) {
      throw new Error(`Tried to read non-existent page ${id}`);
    }

    return buffer;
  }

  writePage(id: PageId, data: Buffer): void {
    if (data.length !== this.pageSize) {
      throw new Error(
        `writePage expected buffer of size ${this.pageSize}, got ${data.length}`
      );
    }

    const offset = id * this.pageSize;
    fs.writeSync(this.fd, data, 0, this.pageSize, offset);
  }

  close(): void {
    fs.closeSync(this.fd);
  }
}
