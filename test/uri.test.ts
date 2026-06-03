// packages/zfilesystem/test/uri.test.ts
import { describe, expect, it } from "vitest";
import {
  buildZFilesystemAssetUriFromContext,
  normalizeZFilesystemAssetUri,
  parseZFilesystemAssetUri,
  resolveZFilesystemAssetUriAgainstRegistry,
  stableZFilesystemUriFromParsed,
} from "../src/uri";

const ctx = {
  chainName: "jungle4",
  rpcUrl: "https://example.com",
  zfilesystemContract: "zfilesystem",
};

describe("uri", () => {
  it("parses asset URI", () => {
    const parsed = parseZFilesystemAssetUri("jungle4://fs@zfilesystem:/alice/icons/logo.png");
    expect(parsed).toEqual({
      chainName: "jungle4",
      contract: "zfilesystem",
      owner: "alice",
      filename: "icons/logo.png",
    });
  });

  it("normalizes slash after contract colon", () => {
    expect(normalizeZFilesystemAssetUri("jungle4://fs@zfilesystem/alice/icons/logo.png")).toBe("jungle4://fs@zfilesystem:/alice/icons/logo.png");
  });

  it("builds stable URI from parsed", () => {
    const uri = stableZFilesystemUriFromParsed({
      chainName: "jungle4",
      contract: "zfilesystem",
      owner: "alice",
      filename: "a/b.txt",
    });
    expect(uri).toBe("jungle4://fs@zfilesystem:/alice/a/b.txt");
  });

  it("builds asset URI from context", () => {
    expect(buildZFilesystemAssetUriFromContext(ctx, "alice", "readme.txt")).toBe("jungle4://fs@zfilesystem:/alice/readme.txt");
  });

  it("resolves against registry", () => {
    const result = resolveZFilesystemAssetUriAgainstRegistry("jungle4://fs@oldcontract:/alice/x.txt", [ctx]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.aligned.contract).toBe("zfilesystem");
    }
  });
});
