// packages/zfilesystem/src/uri.ts
import { ZFS_URI_PATTERN } from "./constants";
import type { ParsedZFilesystemUri, ZfsChainContext, ZfsUriResolveResult, ZfsUrlSearchSource } from "./types";

export function normalizeZFilesystemAssetUri(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  return s.replace(/(\/\/fs@[^:/]+)\/([^/]+\/.+)$/i, "$1:/$2");
}

export function findZfsChainContextByName(registry: ZfsChainContext[], chainName: string): ZfsChainContext | undefined {
  const needle = chainName.trim().toLowerCase();
  if (!needle) return undefined;
  return registry.find((ctx) => ctx.chainName.trim().toLowerCase() === needle);
}

export function alignParsedZfsUriToRegistry(parsed: ParsedZFilesystemUri, target: ZfsChainContext): ParsedZFilesystemUri | null {
  const c = target.zfilesystemContract?.trim();
  if (!c) return null;
  if (target.chainName.toLowerCase() !== parsed.chainName.toLowerCase()) return null;
  return {
    chainName: target.chainName,
    contract: c,
    owner: parsed.owner,
    filename: parsed.filename,
  };
}

export function stableZFilesystemUriFromParsed(p: ParsedZFilesystemUri): string {
  const f = p.filename.trim();
  const base = `${p.chainName}://fs@${p.contract}:/${p.owner}`;
  return normalizeZFilesystemAssetUri(f ? `${base}/${f}` : `${base}`);
}

export function parseZFilesystemAssetUri(raw: string): ParsedZFilesystemUri | null {
  const s = normalizeZFilesystemAssetUri(raw);
  const m = ZFS_URI_PATTERN.exec(s);
  if (!m) return null;
  const tail = (m[3] ?? "").trim().replace(/\/+$/, "");
  const slashIdx = tail.indexOf("/");
  const owner = slashIdx === -1 ? tail : tail.slice(0, slashIdx).trim();
  const filename = slashIdx === -1 ? "" : tail.slice(slashIdx + 1).trim();
  if (filename.endsWith("/")) return null;
  return {
    chainName: m[1]!,
    contract: m[2]!,
    owner,
    filename,
  };
}

export function filenameParentPath(filename: string): string {
  const i = filename.lastIndexOf("/");
  return i <= 0 ? "" : filename.slice(0, i);
}

export function buildZFilesystemAssetUriFromContext(ctx: ZfsChainContext, owner: string, filename: string): string {
  const contract = ctx.zfilesystemContract?.trim();
  const chain = ctx.chainName?.trim();
  const o = owner.trim();
  const f = filename.trim();
  if (!contract || !chain || !o || !f) return "";
  return `${chain}://fs@${contract}:/${o}/${f}`;
}

export function buildZFilesystemExplorerUriFromContext(ctx: ZfsChainContext, owner: string, pathPrefix: string): string {
  const contract = ctx.zfilesystemContract?.trim();
  const chain = ctx.chainName?.trim();
  const o = owner.trim();
  const p = pathPrefix.trim();
  if (!contract || !chain || !o) return "";
  if (!p) return `${chain}://fs@${contract}:/${o}`;
  return `${chain}://fs@${contract}:/${o}/${p}`;
}

export function buildZFilesystemUriDraftPrefixFromContext(ctx: ZfsChainContext): string {
  const contract = ctx.zfilesystemContract?.trim();
  const chain = ctx.chainName?.trim();
  if (!contract || !chain) return "";
  return `${chain}://fs@${contract}:/`;
}

export function readZfsUrlQueryParam(source: ZfsUrlSearchSource): string {
  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed) return "";
    const query = trimmed.startsWith("?") ? trimmed.slice(1) : trimmed;
    return new URLSearchParams(query).get("zfs")?.trim() ?? "";
  }
  return source.get("zfs")?.trim() ?? "";
}

export function hasZfsUrlDeepLink(source: ZfsUrlSearchSource): boolean {
  return readZfsUrlQueryParam(source).length > 0;
}

export function readUrlNetworkQueryParam(source: ZfsUrlSearchSource): string {
  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed) return "";
    const query = trimmed.startsWith("?") ? trimmed.slice(1) : trimmed;
    return new URLSearchParams(query).get("network")?.trim().toLowerCase() ?? "";
  }
  return source.get("network")?.trim().toLowerCase() ?? "";
}

export function areZFilesystemAssetUrisEqual(a: string, b: string): boolean {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) return false;
  return normalizeZFilesystemAssetUri(left) === normalizeZFilesystemAssetUri(right);
}

export function resolveZFilesystemAssetUriAgainstRegistry(raw: string, registry: ZfsChainContext[]): ZfsUriResolveResult {
  const normalized = normalizeZFilesystemAssetUri(raw);
  if (!normalized) return { ok: false, failure: "invalid" };
  const parsed = parseZFilesystemAssetUri(normalized);
  if (!parsed) return { ok: false, failure: "invalid" };
  const target = findZfsChainContextByName(registry, parsed.chainName);
  if (!target) return { ok: false, failure: "chain_not_in_app" };
  const aligned = alignParsedZfsUriToRegistry(parsed, target);
  if (!aligned) return { ok: false, failure: "missing_contract" };
  return { ok: true, aligned, normalized };
}

export function cloneSearchParamsWithoutZfs(search: string): URLSearchParams {
  const params = new URLSearchParams(search);
  params.delete("zfs");
  return params;
}
