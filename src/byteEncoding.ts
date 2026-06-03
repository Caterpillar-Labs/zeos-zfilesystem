// packages/zfilesystem/src/byteEncoding.ts

export function toBase64(data: Uint8Array): string {
  if (typeof globalThis.Buffer !== "undefined") {
    return globalThis.Buffer.from(data).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]!);
  }
  return globalThis.btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  if (typeof globalThis.Buffer !== "undefined") {
    return new Uint8Array(globalThis.Buffer.from(b64, "base64"));
  }
  const binary = globalThis.atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function toHex(data: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < data.length; i++) {
    hex += data[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}
