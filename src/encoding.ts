// packages/zfilesystem/src/encoding.ts
import { ZFS_BASE122_ILLEGALS, ZFS_BASE122_SHORTENED } from "./constants";
import { fromBase64, toBase64, toHex } from "./byteEncoding";
import type { ZFilesystemDataEncoding } from "./types";

function zfsIsHexDataString(s: string): boolean {
  return s.length > 0 && s.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(s);
}

function zfsIsBase64String(s: string): boolean {
  if (s.length === 0) return false;
  if (s.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(s);
}

function zfsEncodeBase122(data: Uint8Array): string {
  let curIndex = 0;
  let curBit = 0;
  const out: number[] = [];

  const get7 = (): number | null => {
    if (curIndex >= data.length) return null;

    const firstByte = data[curIndex] ?? 0;
    let firstPart = ((0b11111110 >>> curBit) & firstByte) << curBit;
    firstPart >>= 1;

    curBit += 7;
    if (curBit < 8) return firstPart;

    curBit -= 8;
    curIndex += 1;

    if (curIndex >= data.length) return firstPart;

    const secondByte = data[curIndex] ?? 0;
    let secondPart = (0xff00 >>> curBit) & secondByte & 0xff;
    secondPart >>= 8 - curBit;

    return firstPart | secondPart;
  };

  while (true) {
    const bits = get7();
    if (bits === null) break;

    const illegalIndex = ZFS_BASE122_ILLEGALS.indexOf(bits);
    if (illegalIndex === -1) {
      out.push(bits);
      continue;
    }

    let nextBits = get7();
    let b1 = 0b11000010;
    let b2 = 0b10000000;

    if (nextBits === null) {
      b1 |= ZFS_BASE122_SHORTENED << 2;
      nextBits = bits;
    } else {
      b1 |= illegalIndex << 2;
    }

    b1 |= (nextBits & 0b01000000) > 0 ? 1 : 0;
    b2 |= nextBits & 0b00111111;

    out.push(b1, b2);
  }

  return new TextDecoder().decode(new Uint8Array(out));
}

function zfsDecodeBase122(raw: string): Uint8Array | null {
  const out: number[] = [];
  let curByte = 0;
  let bitOfByte = 0;

  const push7 = (byte: number) => {
    byte <<= 1;
    curByte |= byte >>> bitOfByte;
    bitOfByte += 7;
    if (bitOfByte >= 8) {
      out.push(curByte & 0xff);
      bitOfByte -= 8;
      curByte = (byte << (7 - bitOfByte)) & 0xff;
    }
  };

  for (let i = 0; i < raw.length; i += 1) {
    const c = raw.charCodeAt(i);
    if (c > 0x07ff) return null;

    if (c > 127) {
      const illegalIndex = (c >>> 8) & 0b111;
      if (illegalIndex !== ZFS_BASE122_SHORTENED) {
        const illegal = ZFS_BASE122_ILLEGALS[illegalIndex];
        if (illegal === undefined) return null;
        push7(illegal);
      }
      push7(c & 0b01111111);
      continue;
    }

    if (ZFS_BASE122_ILLEGALS.includes(c)) return null;
    push7(c);
  }

  return new Uint8Array(out);
}

function zfsDecodeHex(raw: string): Uint8Array | null {
  if (!zfsIsHexDataString(raw)) return null;
  const out = new Uint8Array(raw.length / 2);
  for (let i = 0; i < raw.length; i += 2) {
    const byte = Number.parseInt(raw.slice(i, i + 2), 16);
    if (!Number.isFinite(byte)) return null;
    out[i / 2] = byte;
  }
  return out;
}

function zfsDecodeBase64Strict(raw: string): Uint8Array | null {
  if (!zfsIsBase64String(raw)) return null;
  try {
    return fromBase64(raw);
  } catch {
    return null;
  }
}

function zfsDecodeEncodedDataString(raw: string): Uint8Array | null {
  const prefixed = /^(b64|b122|hex)[:|]([\s\S]*)$/.exec(raw);
  if (prefixed) {
    const prefix = prefixed[1] as ZFilesystemDataEncoding;
    const payload = prefixed[2] as string;
    switch (prefix) {
      case "b64":
        return zfsDecodeBase64Strict(payload.trim());
      case "hex":
        return zfsDecodeHex(payload.trim());
      case "b122":
        return zfsDecodeBase122(payload);
    }
  }

  const trimmed = raw.trim();
  const maybeHex = zfsDecodeHex(trimmed);
  if (maybeHex) return maybeHex;

  const maybeB64 = zfsDecodeBase64Strict(trimmed);
  if (maybeB64) return maybeB64;

  return new TextEncoder().encode(trimmed);
}

export function zfsEncodeDataBytes(bytes: Uint8Array, encoding: ZFilesystemDataEncoding): string {
  switch (encoding) {
    case "b64":
      return `b64:${toBase64(bytes)}`;
    case "hex":
      return `hex:${toHex(bytes)}`;
    case "b122":
      return `b122:${zfsEncodeBase122(bytes)}`;
    default:
      return `b64:${toBase64(bytes)}`;
  }
}

function zfsDetectEncodingFromRawString(raw: string): ZFilesystemDataEncoding {
  const prefixed = /^(b64|b122|hex)[:|]([\s\S]*)$/.exec(raw);
  if (prefixed) {
    return prefixed[1] as ZFilesystemDataEncoding;
  }
  const trimmed = raw.trim();
  if (zfsIsHexDataString(trimmed)) return "hex";
  if (zfsIsBase64String(trimmed)) return "b64";
  return "b64";
}

export function zfsUploadDataToBytesWithEncoding(raw: unknown): { bytes: Uint8Array; encodingUsed: ZFilesystemDataEncoding } | null {
  if (raw == null) {
    return { bytes: new Uint8Array(0), encodingUsed: "b64" };
  }
  if (raw instanceof Uint8Array) {
    return { bytes: raw, encodingUsed: "b64" };
  }
  if (typeof raw === "object" && raw !== null) {
    const arr = (raw as { array?: Uint8Array }).array;
    if (arr instanceof Uint8Array) {
      return { bytes: new Uint8Array(arr), encodingUsed: "b64" };
    }
  }
  if (typeof raw !== "string") {
    return null;
  }
  const encodingUsed = zfsDetectEncodingFromRawString(raw);
  const bytes = zfsDecodeEncodedDataString(raw);
  if (!bytes) return null;
  return { bytes, encodingUsed };
}

export function zfsIsHexDataStringExport(s: string): boolean {
  return zfsIsHexDataString(s);
}
