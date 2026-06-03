// packages/zfilesystem/src/read.ts
import { ABI, Bytes, Serializer, type ABIDef } from "@wharfkit/antelope";
import { fetchAllTableRows } from "./chainClient";
import { zfsUploadDataToBytesWithEncoding } from "./encoding";
import type { FetchFileContentParams, FetchFilesParams, ZFilesystemDataEncoding, ZFilesystemDecodedFileContent, ZFilesystemFileRow, ZfsChainClient, ZfsChunksLegacyRow, ZfsFileChainRow, ZfsUploadActionData } from "./types";

function zfsUploadAbiStructName(abiDef: ABIDef): string {
  const actions = (abiDef as { actions?: { name?: string; type?: string }[] }).actions;
  if (!Array.isArray(actions)) {
    return "upload";
  }
  const uploadAction = actions.find((a) => a?.name === "upload");
  if (uploadAction?.type && typeof uploadAction.type === "string") {
    return uploadAction.type;
  }
  return "upload";
}

function zfsIsUploadActionData(obj: object): obj is ZfsUploadActionData {
  return "owner" in obj && "filename" in obj && "chunk_id" in obj;
}

function zfsDecodeUploadAction(action: { account?: string; name?: string; data?: unknown; hex_data?: string }, abiDef: ABIDef, uploadStructName: string): ZfsUploadActionData | null {
  if (action?.name !== "upload") return null;

  if (action.data && typeof action.data === "object" && action.data !== null && !Array.isArray(action.data)) {
    if (zfsIsUploadActionData(action.data)) {
      return action.data;
    }
  }

  const rawHex = typeof action.hex_data === "string" ? action.hex_data : typeof action.data === "string" && /^[0-9a-fA-F]+$/.test(action.data) && action.data.length % 2 === 0 ? action.data : null;
  if (!rawHex) {
    return null;
  }

  try {
    const abi = ABI.from(abiDef);
    const decoded = Serializer.decode({
      abi,
      data: Bytes.from(rawHex, "hex"),
      type: uploadStructName,
    });
    const raw = decoded != null && typeof decoded === "object" && "toJSON" in decoded && typeof (decoded as { toJSON?: () => unknown }).toJSON === "function" ? (decoded as { toJSON: () => unknown }).toJSON() : decoded;
    if (raw != null && typeof raw === "object" && !Array.isArray(raw) && zfsIsUploadActionData(raw)) {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

function zfsNameToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return String(value);
}

function zfsCollectTransactionsFromBlock(block: unknown): unknown[] {
  const txs = (block as { transactions?: unknown })?.transactions;
  if (!Array.isArray(txs)) {
    return [];
  }
  const out: unknown[] = [];
  for (const wrap of txs) {
    if (!wrap || typeof wrap !== "object") continue;
    const trx = (wrap as { trx?: unknown })?.trx;
    if (trx && typeof trx === "object") {
      out.push(trx);
      continue;
    }
    const maybeActions = (wrap as { actions?: unknown })?.actions;
    if (Array.isArray(maybeActions)) {
      out.push(wrap);
      continue;
    }
    const maybeTransaction = (wrap as { transaction?: unknown })?.transaction;
    if (maybeTransaction && typeof maybeTransaction === "object") {
      out.push(maybeTransaction);
      continue;
    }
  }
  return out;
}

function zfsActionsFromTransaction(trx: unknown): unknown[] {
  if (!trx || typeof trx !== "object") {
    return [];
  }
  const t = (trx as { transaction?: { actions?: unknown[] }; packed_trx?: unknown; actions?: unknown[]; trx?: unknown }).transaction;
  const outerActions = (trx as { actions?: unknown[] }).actions;
  const trxInner = (trx as { trx?: { actions?: unknown[] } }).trx;
  const innerActions = t && typeof t === "object" ? (t as { actions?: unknown[] }).actions : undefined;
  const innerActions2 = trxInner && typeof trxInner === "object" ? trxInner.actions : undefined;
  const actions = Array.isArray(innerActions) ? innerActions : Array.isArray(innerActions2) ? innerActions2 : Array.isArray(outerActions) ? outerActions : null;
  return actions ?? [];
}

async function zfsFetchBlockOnceForChunks(params: {
  client: ZfsChainClient;
  blockNum: number;
  contract: string;
  owner: string;
  filename: string;
  maxChunkIndex: number;
  abiDef: ABIDef;
  uploadStructName: string;
}): Promise<Map<number, Array<{ bytes: Uint8Array; encodingUsed: ZFilesystemDataEncoding; filenameUsed: string }>>> {
  const { client, blockNum, contract, owner, filename, maxChunkIndex, abiDef, uploadStructName } = params;

  let block: unknown;
  try {
    block = await client.getBlock(blockNum, { transaction_details: "full" });
  } catch {
    return new Map();
  }

  const out = new Map<number, Array<{ bytes: Uint8Array; encodingUsed: ZFilesystemDataEncoding; filenameUsed: string }>>();

  for (const trx of zfsCollectTransactionsFromBlock(block)) {
    const actions = zfsActionsFromTransaction(trx);
    for (const act of actions) {
      const maybeAct = (act as { act?: unknown })?.act;
      const a = (maybeAct && typeof maybeAct === "object" ? maybeAct : act) as {
        account?: string;
        name?: string;
        data?: unknown;
        hex_data?: string;
      };

      if (a.account !== contract || a.name !== "upload") continue;

      const decoded = zfsDecodeUploadAction(a, abiDef, uploadStructName);
      if (!decoded) continue;
      if (zfsNameToString(decoded.owner) !== owner) continue;

      const decodedFilename = zfsNameToString(decoded.filename);
      const chunkId = Number(decoded.chunk_id);
      if (!Number.isFinite(chunkId)) continue;
      if (chunkId < 0 || chunkId >= maxChunkIndex) continue;

      const bytesWithEncoding = zfsUploadDataToBytesWithEncoding(decoded.data);
      if (!bytesWithEncoding) continue;

      const prev = out.get(chunkId) ?? [];
      prev.push({ bytes: bytesWithEncoding.bytes, encodingUsed: bytesWithEncoding.encodingUsed, filenameUsed: decodedFilename });
      out.set(chunkId, prev);
    }
  }

  void filename;
  return out;
}

async function zfsTryFetchFromChunksTableWithEncoding(params: { client: ZfsChainClient; contract: string; owner: string; filename: string; chunkCount: number }): Promise<{ bytes: Uint8Array; encodingUsed: ZFilesystemDataEncoding } | null> {
  const { client, contract, owner, filename, chunkCount } = params;
  if (chunkCount <= 0) {
    return { bytes: new Uint8Array(0), encodingUsed: "b64" };
  }

  let rows: ZfsChunksLegacyRow[];
  try {
    rows = await fetchAllTableRows<ZfsChunksLegacyRow>(client, {
      code: contract,
      table: "chunks",
      scope: owner,
    });
  } catch {
    return null;
  }

  if (!rows?.length) {
    return null;
  }

  const forFile = rows.filter((row) => (row.filename != null && String(row.filename) === filename) || (row.name != null && String(row.name) === filename));

  const parts: Uint8Array[] = [];
  let encodingUsed: ZFilesystemDataEncoding | null = null;
  for (let i = 0; i < chunkCount; i++) {
    const row = forFile.find((r) => Number(r.chunk_id ?? r.chunkId) === i);
    if (!row) {
      return null;
    }
    const raw = row?.data ?? row?.content;
    if (raw == null || typeof raw !== "string") {
      return null;
    }
    const decodedWithEncoding = zfsUploadDataToBytesWithEncoding(raw);
    if (!decodedWithEncoding) return null;
    if (!encodingUsed) encodingUsed = decodedWithEncoding.encodingUsed;
    parts.push(decodedWithEncoding.bytes);
  }

  const total = parts.reduce((acc, p) => acc + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return { bytes: out, encodingUsed: encodingUsed ?? "b64" };
}

function zfsAbiHasTable(abiDef: ABIDef, tableName: string): boolean {
  const tables = (abiDef as { tables?: Array<{ name?: string }> }).tables;
  if (!Array.isArray(tables)) return false;
  return tables.some((t) => t?.name === tableName);
}

async function fetchZFilesystemAbi(client: ZfsChainClient, contract: string): Promise<ABIDef> {
  return client.getAbi(contract);
}

export async function fetchFilesZFilesystem(params: FetchFilesParams): Promise<ZFilesystemFileRow[]> {
  const { client, contract, owner } = params;
  const rows = await fetchAllTableRows<ZfsFileChainRow>(client, {
    code: contract,
    table: "fs",
    scope: owner,
  });

  const withOwner = rows.map((row) => ({
    filename: String(row.filename || ""),
    chunks: Array.isArray(row.chunks) ? row.chunks.map((c) => Number(c)) : [],
    rowOwner: row.owner != null ? String(row.owner) : undefined,
  }));

  const filtered = withOwner.filter((row) => row.rowOwner === undefined || row.rowOwner === owner);

  if (rows.length > 0) {
    return filtered.map(({ filename, chunks }) => ({ filename, chunks }));
  }

  const contractScoped = await fetchAllTableRows<ZfsFileChainRow>(client, {
    code: contract,
    table: "fs",
    scope: contract,
  });

  return contractScoped
    .filter((row) => row.owner != null && String(row.owner) === owner)
    .map((row) => ({
      filename: String(row.filename || ""),
      chunks: Array.isArray(row.chunks) ? row.chunks.map((c) => Number(c)) : [],
    }));
}

export async function fetchFileContentZFilesystem(params: FetchFileContentParams): Promise<Uint8Array> {
  const result = await fetchFileContentZFilesystemWithEncoding(params);
  return result.bytes;
}

export async function fetchFileContentZFilesystemWithEncoding(params: FetchFileContentParams): Promise<ZFilesystemDecodedFileContent> {
  const { client, contract, owner, filename, chunkIds } = params;
  const locatorCount = chunkIds.length;
  if (locatorCount === 0) {
    return { bytes: new Uint8Array(0), encodingUsed: "b64" };
  }

  let abiDef: ABIDef;
  try {
    abiDef = await fetchZFilesystemAbi(client, contract);
  } catch {
    return { bytes: new Uint8Array(0), encodingUsed: "b64" };
  }

  if (zfsAbiHasTable(abiDef, "chunks")) {
    const fromChunksTable = await zfsTryFetchFromChunksTableWithEncoding({
      client,
      contract,
      owner,
      filename,
      chunkCount: locatorCount,
    });
    if (fromChunksTable !== null) {
      return fromChunksTable;
    }
  }

  const uploadStructName = zfsUploadAbiStructName(abiDef);
  const uniqueBlockNums = Array.from(new Set(chunkIds.map((n) => Number(n)).filter((n) => Number.isFinite(n))));

  const blockToChunks = new Map<number, Map<number, Array<{ bytes: Uint8Array; encodingUsed: ZFilesystemDataEncoding; filenameUsed: string }>>>();
  for (const blockNum of uniqueBlockNums) {
    let chunksInBlock: Map<number, Array<{ bytes: Uint8Array; encodingUsed: ZFilesystemDataEncoding; filenameUsed: string }>>;
    try {
      chunksInBlock = await zfsFetchBlockOnceForChunks({
        client,
        blockNum,
        contract,
        owner,
        filename,
        maxChunkIndex: locatorCount,
        abiDef,
        uploadStructName,
      });
    } catch {
      chunksInBlock = new Map();
    }
    blockToChunks.set(blockNum, chunksInBlock);
  }

  const chunkCandidatesByIndex = new Map<number, Array<{ bytes: Uint8Array; encodingUsed: ZFilesystemDataEncoding; filenameUsed: string }>>();

  for (let i = 0; i < locatorCount; i++) {
    const blockNum = Number(chunkIds[i]);
    if (!Number.isFinite(blockNum)) {
      return { bytes: new Uint8Array(0), encodingUsed: "b64" };
    }
    const candidates = blockToChunks.get(blockNum)?.get(i) ?? null;
    if (!candidates || candidates.length === 0) {
      return { bytes: new Uint8Array(0), encodingUsed: "b64" };
    }
    chunkCandidatesByIndex.set(i, candidates);
  }

  const scoreByFilename = new Map<string, number>();
  for (let i = 0; i < locatorCount; i++) {
    const candidates = chunkCandidatesByIndex.get(i)!;
    const unique = new Set(candidates.map((c) => c.filenameUsed));
    for (const f of unique) {
      scoreByFilename.set(f, (scoreByFilename.get(f) ?? 0) + 1);
    }
  }

  let bestFilenameUsed: string | null = null;
  let bestScore = -1;
  const chunk0Candidates = chunkCandidatesByIndex.get(0) ?? [];
  const chunk0Filenames = new Set(chunk0Candidates.map((c) => c.filenameUsed));
  for (const [f, score] of scoreByFilename.entries()) {
    if (score > bestScore) {
      bestScore = score;
      bestFilenameUsed = f;
    } else if (score === bestScore && bestFilenameUsed) {
      if (!chunk0Filenames.has(bestFilenameUsed) && chunk0Filenames.has(f)) {
        bestFilenameUsed = f;
      }
    }
  }

  void filename;
  void bestScore;

  const parts: Uint8Array[] = [];
  let encodingUsed: ZFilesystemDataEncoding | null = null;
  for (let i = 0; i < locatorCount; i++) {
    const candidates = chunkCandidatesByIndex.get(i)!;
    const chosen = bestFilenameUsed ? (candidates.find((c) => c.filenameUsed === bestFilenameUsed) ?? candidates[0]) : candidates[0];
    if (!encodingUsed) encodingUsed = chosen!.encodingUsed;
    parts.push(chosen!.bytes);
  }

  const total = parts.reduce((acc, p) => acc + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return { bytes: out, encodingUsed: encodingUsed ?? "b64" };
}
