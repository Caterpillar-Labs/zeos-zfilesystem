// packages/zfilesystem/src/types.ts
import type { ABIDef } from "@wharfkit/antelope";

export type ZFilesystemDataEncoding = "b64" | "b122" | "hex";

export interface ZfsUploadActionParams {
  owner: string;
  filename: string;
  chunk_id: number;
  data?: string;
}

export interface ZfsUploadActionData {
  owner: string | { toString(): string };
  filename: string | { toString(): string };
  chunk_id: number | string | bigint;
  data?: string | Uint8Array;
  encoding?: string;
}

export interface ZfsFileChainRow {
  filename: string;
  chunks: number[];
  owner?: string;
}

export interface ZfsChunksLegacyRow {
  filename?: string;
  name?: string;
  chunk_id?: number;
  chunkId?: number;
  data?: string;
  content?: string;
  encoding?: string;
}

export interface ParsedZFilesystemUri {
  chainName: string;
  contract: string;
  owner: string;
  filename: string;
}

export type ZfsUriResolveFailure = "invalid" | "chain_not_in_app" | "missing_contract";

export type ZfsUriResolveResult = { ok: true; aligned: ParsedZFilesystemUri; normalized: string } | { ok: false; failure: ZfsUriResolveFailure };

export type ZfsUrlSearchSource = { get(name: string): string | null } | string;

export interface ZfsDirectoryFileEntry {
  relativeName: string;
  fullPath: string;
}

export interface ZFilesystemFileRow {
  filename: string;
  chunks: number[];
}

export interface ZFilesystemDecodedFileContent {
  bytes: Uint8Array;
  encodingUsed: ZFilesystemDataEncoding;
}

export interface FileChunk {
  chunkId: number;
  data: Uint8Array;
}

export interface ZfsChainContext {
  chainName: string;
  rpcUrl: string;
  zfilesystemContract: string;
  id?: string;
}

export interface ZfsGetTableRowsParams {
  code: string;
  table: string;
  scope: string;
  index_position?: number;
  key_type?: string;
  lower_bound?: string;
}

export interface ZfsGetTableRowsResponse<TRow = object> {
  rows?: TRow[];
  more?: boolean | string;
  next_key?: string;
}

export interface ZfsChainClient {
  getAbi(account: string): Promise<ABIDef>;
  getTableRows<TRow = object>(params: ZfsGetTableRowsParams): Promise<ZfsGetTableRowsResponse<TRow>>;
  getBlock(blockNumOrId: string | number, options?: { transaction_details?: string }): Promise<unknown>;
}

export interface ZfsEosioAction {
  account: string;
  name: string;
  data: Record<string, unknown>;
}

export interface ZfsEosioActionWithAuth extends ZfsEosioAction {
  authorization?: Array<{ actor: string; permission: string } | string>;
}

export interface ZfsUploadChunkInput {
  chunkId: number;
  data: Uint8Array;
}

export interface BuildUploadActionsParams {
  contract: string;
  owner: string;
  filename: string;
  chunks: ZfsUploadChunkInput[];
  encoding: ZFilesystemDataEncoding;
}

export interface BuildRenameActionParams {
  contract: string;
  owner: string;
  filename: string;
  newFilename: string;
}

export interface BuildEraseActionParams {
  contract: string;
  owner: string;
  filename: string;
}

export interface FetchFilesParams {
  client: ZfsChainClient;
  contract: string;
  owner: string;
}

export interface FetchFileContentParams {
  client: ZfsChainClient;
  contract: string;
  owner: string;
  filename: string;
  chunkIds: number[];
}
