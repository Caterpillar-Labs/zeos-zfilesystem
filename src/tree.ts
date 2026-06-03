// packages/zfilesystem/src/tree.ts
import type { ZfsDirectoryFileEntry } from "./types";
import { filenameParentPath } from "./uri";

export function resolveZfsExplorerPathFromIndex(filenames: string[], relativePath: string): { pathPrefix: string; focusFilename: string | null } {
  const rp = relativePath.trim();
  if (!rp) return { pathPrefix: "", focusFilename: null };
  if (filenames.includes(rp)) {
    return { pathPrefix: filenameParentPath(rp), focusFilename: rp };
  }
  if (filenames.some((f) => f.startsWith(`${rp}/`))) {
    return { pathPrefix: rp, focusFilename: null };
  }
  return { pathPrefix: filenameParentPath(rp), focusFilename: null };
}

export function isZfsRelativePathMissingFromIndex(filenames: string[], relativePath: string): boolean {
  const rp = relativePath.trim();
  if (!rp) return false;
  if (filenames.includes(rp)) return false;
  if (filenames.some((f) => f.startsWith(`${rp}/`))) return false;
  return true;
}

export function listZfsDirectoryChildren(
  allFilenames: string[],
  pathPrefix: string,
): {
  directories: string[];
  files: ZfsDirectoryFileEntry[];
} {
  const dirs = new Set<string>();
  const files: ZfsDirectoryFileEntry[] = [];
  const base = pathPrefix.trim();
  const prefixWithSlash = base ? `${base}/` : "";

  const seenDir = new Set<string>();

  for (const fullPath of allFilenames) {
    if (!fullPath) continue;
    if (base && !fullPath.startsWith(prefixWithSlash)) continue;

    const rel = base ? fullPath.slice(prefixWithSlash.length) : fullPath;
    if (!rel) continue;

    const slash = rel.indexOf("/");
    if (slash === -1) {
      files.push({ relativeName: rel, fullPath });
    } else {
      const dir = rel.slice(0, slash);
      if (!seenDir.has(dir)) {
        seenDir.add(dir);
        dirs.add(dir);
      }
    }
  }

  return {
    directories: Array.from(dirs).sort((a, b) => a.localeCompare(b)),
    files: files.sort((a, b) => a.relativeName.localeCompare(b.relativeName)),
  };
}
