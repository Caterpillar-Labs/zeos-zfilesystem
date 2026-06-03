// packages/zfilesystem/test/txBuilders.test.ts
import { describe, expect, it } from "vitest";
import { buildEraseAction, buildRenameAction, buildUploadActions } from "../src/txBuilders";

describe("txBuilders", () => {
  it("builds upload actions", () => {
    const actions = buildUploadActions({
      contract: "zfilesystem",
      owner: "alice",
      filename: "a.txt",
      encoding: "b64",
      chunks: [{ chunkId: 0, data: new TextEncoder().encode("hi") }],
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]?.name).toBe("upload");
    expect(actions[0]?.data.chunk_id).toBe(0);
    expect(String(actions[0]?.data.data)).toMatch(/^b64:/);
  });

  it("builds rename action", () => {
    const action = buildRenameAction({
      contract: "zfilesystem",
      owner: "alice",
      filename: "a.txt",
      newFilename: "b.txt",
    });
    expect(action.name).toBe("rename");
    expect(action.data.new_filename).toBe("b.txt");
  });

  it("builds erase action", () => {
    const action = buildEraseAction({
      contract: "zfilesystem",
      owner: "alice",
      filename: "a.txt",
    });
    expect(action.name).toBe("erase");
  });
});
