// packages/zfilesystem/src/validation.ts

export function isValidZfsFilename(filename: string): boolean {
  if (!filename) return false;
  if (filename.startsWith("/")) return false;
  if (filename.endsWith("/")) return false;

  const allowed = /^[A-Za-z0-9._~/-]+$/;
  if (!allowed.test(filename)) return false;

  const segments = filename.split("/");
  if (segments.some((s) => s.length === 0)) return false;
  if (segments.some((s) => s === "." || s === "..")) return false;

  return true;
}
