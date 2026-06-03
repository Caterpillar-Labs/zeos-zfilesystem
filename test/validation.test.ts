// packages/zfilesystem/test/validation.test.ts
import { describe, expect, it } from "vitest";
import { isValidZfsFilename } from "../src/validation";

describe("validation", () => {
  it("accepts valid paths", () => {
    expect(isValidZfsFilename("icons/logo.png")).toBe(true);
    expect(isValidZfsFilename("docs/guide.html")).toBe(true);
  });

  it("rejects invalid paths", () => {
    expect(isValidZfsFilename("/absolute.png")).toBe(false);
    expect(isValidZfsFilename("icons/")).toBe(false);
    expect(isValidZfsFilename("icons/../secret")).toBe(false);
  });
});
