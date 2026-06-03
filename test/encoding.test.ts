// packages/zfilesystem/test/encoding.test.ts
import { describe, expect, it } from "vitest";
import { zfsEncodeDataBytes, zfsUploadDataToBytesWithEncoding } from "../src/encoding";

describe("encoding", () => {
  it("roundtrips b64", () => {
    const bytes = new TextEncoder().encode("hello zfs");
    const encoded = zfsEncodeDataBytes(bytes, "b64");
    const decoded = zfsUploadDataToBytesWithEncoding(encoded);
    expect(decoded?.encodingUsed).toBe("b64");
    expect(new TextDecoder().decode(decoded!.bytes)).toBe("hello zfs");
  });

  it("roundtrips hex", () => {
    const bytes = new Uint8Array([0, 255, 16]);
    const encoded = zfsEncodeDataBytes(bytes, "hex");
    const decoded = zfsUploadDataToBytesWithEncoding(encoded);
    expect(decoded?.encodingUsed).toBe("hex");
    expect([...decoded!.bytes]).toEqual([0, 255, 16]);
  });

  it("roundtrips b122", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const encoded = zfsEncodeDataBytes(bytes, "b122");
    const decoded = zfsUploadDataToBytesWithEncoding(encoded);
    expect(decoded?.encodingUsed).toBe("b122");
    expect([...decoded!.bytes]).toEqual([...bytes]);
  });
});
