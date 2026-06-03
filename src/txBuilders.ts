// packages/zfilesystem/src/txBuilders.ts
import { zfsEncodeDataBytes } from "./encoding";
import type { BuildEraseActionParams, BuildRenameActionParams, BuildUploadActionsParams, ZfsEosioAction } from "./types";

export function buildUploadActions(params: BuildUploadActionsParams): ZfsEosioAction[] {
  const { contract, owner, filename, chunks, encoding } = params;
  return chunks.map((c) => ({
    account: contract,
    name: "upload",
    data: {
      owner,
      filename,
      chunk_id: c.chunkId,
      data: zfsEncodeDataBytes(c.data, encoding),
    },
  }));
}

export function buildRenameAction(params: BuildRenameActionParams): ZfsEosioAction {
  const { contract, owner, filename, newFilename } = params;
  return {
    account: contract,
    name: "rename",
    data: {
      owner,
      filename,
      new_filename: newFilename,
    },
  };
}

export function buildEraseAction(params: BuildEraseActionParams): ZfsEosioAction {
  const { contract, owner, filename } = params;
  return {
    account: contract,
    name: "erase",
    data: {
      owner,
      filename,
    },
  };
}
