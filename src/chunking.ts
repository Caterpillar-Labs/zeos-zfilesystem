// packages/zfilesystem/src/chunking.ts
import type { FileChunk } from "./types";

export function chunkFile(file: File, chunkSize: number): Promise<FileChunk[]> {
  const size = Math.max(chunkSize, 1);
  const chunks: FileChunk[] = [];
  const totalChunks = Math.ceil(file.size / size);

  const readChunk = (index: number): Promise<void> => {
    if (index >= totalChunks) {
      return Promise.resolve();
    }
    const start = index * size;
    const end = Math.min(start + size, file.size);
    const blob = file.slice(start, end);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (result instanceof ArrayBuffer) {
          chunks.push({
            chunkId: index,
            data: new Uint8Array(result),
          });
          resolve(undefined);
        } else {
          reject(new Error("Unexpected reader result type"));
        }
      };
      reader.onerror = () => reject(reader.error || new Error("Failed to read file chunk"));
      reader.readAsArrayBuffer(blob);
    }).then(() => readChunk(index + 1));
  };

  return readChunk(0).then(() => chunks);
}

export function chunkUint8Array(data: Uint8Array, chunkSize: number): FileChunk[] {
  const size = Math.max(chunkSize, 1);
  const totalChunks = Math.ceil(data.length / size);
  const chunks: FileChunk[] = [];
  for (let index = 0; index < totalChunks; index++) {
    const start = index * size;
    const end = Math.min(start + size, data.length);
    chunks.push({ chunkId: index, data: data.subarray(start, end) });
  }
  return chunks;
}
