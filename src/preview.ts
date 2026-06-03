// packages/zfilesystem/src/preview.ts
import { ZFS_HTML_INLINE_MAX_ASSET_BYTES } from "./constants";
import { filenameParentPath } from "./uri";

function resolveSiblingPath(htmlFullPath: string, refRaw: string): string {
  const ref = refRaw.replace(/^\.\//, "").trim();
  if (!ref || ref.includes("..") || /^[a-z][a-z0-9+.-]*:/i.test(ref)) {
    return "";
  }
  const dir = filenameParentPath(htmlFullPath);
  return dir ? `${dir}/${ref}` : ref;
}

function uint8ToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

export async function inlineZfsRelativeAssetsForHtmlPreview(params: { htmlText: string; htmlFullPath: string; fetchSiblingBytes: (resolvedPath: string) => Promise<Uint8Array | null>; mimeForPath: (resolvedPath: string, bytes: Uint8Array) => string; maxAssetBytes?: number }): Promise<string> {
  const { htmlText, htmlFullPath, fetchSiblingBytes, mimeForPath } = params;
  const maxB = params.maxAssetBytes ?? ZFS_HTML_INLINE_MAX_ASSET_BYTES;

  const re = /\b(src|href)=(["'])((?:\.\/)?[^"'?#\s]+)\2/gi;
  const matches = [...htmlText.matchAll(re)];
  const replacements = new Map<string, string>();

  for (const m of matches) {
    const quote = m[2]!;
    const refRaw = m[3]!;
    if (/^(https?:|data:|mailto:|javascript:|#)/i.test(refRaw)) continue;

    const resolved = resolveSiblingPath(htmlFullPath, refRaw);
    if (!resolved) continue;

    const fromLiteral = `${m[1]}=${quote}${refRaw}${quote}`;
    if (replacements.has(fromLiteral)) continue;

    const bytes = await fetchSiblingBytes(resolved);
    if (!bytes?.length || bytes.length > maxB) continue;

    const mime = mimeForPath(resolved, bytes);
    const dataUrl = `data:${mime};base64,${uint8ToBase64(bytes)}`;
    const toLiteral = `${m[1]}=${quote}${dataUrl}${quote}`;
    replacements.set(fromLiteral, toLiteral);
  }

  let out = htmlText;
  const ordered = [...replacements.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of ordered) {
    out = out.split(from).join(to);
  }

  return out;
}
