// packages/zfilesystem/test/tree.test.ts
import { describe, expect, it } from "vitest";
import { listZfsDirectoryChildren, resolveZfsExplorerPathFromIndex } from "../src/tree";

describe("tree", () => {
  const files = ["readme.txt", "icons/a.png", "icons/b.png", "docs/guide.html"];

  it("lists root directory", () => {
    const listing = listZfsDirectoryChildren(files, "");
    expect(listing.directories).toEqual(["docs", "icons"]);
    expect(listing.files.map((f) => f.relativeName)).toEqual(["readme.txt"]);
  });

  it("lists nested directory", () => {
    const listing = listZfsDirectoryChildren(files, "icons");
    expect(listing.files.map((f) => f.fullPath)).toEqual(["icons/a.png", "icons/b.png"]);
  });

  it("resolves explorer path from index", () => {
    expect(resolveZfsExplorerPathFromIndex(files, "icons/a.png")).toEqual({
      pathPrefix: "icons",
      focusFilename: "icons/a.png",
    });
  });
});
