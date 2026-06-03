// packages/zfilesystem/src/constants.ts

export const ZFS_BASE122_ILLEGALS: number[] = [0, 10, 13, 34, 38, 92];

export const ZFS_BASE122_SHORTENED = 0b111;

export const ZFS_HTML_INLINE_MAX_ASSET_BYTES = 1_500_000;

export const ZFS_URI_PATTERN = /^([a-z0-9][a-z0-9._-]*):\/\/fs@([^:/]+)(?::\/|\/)([\s\S]*)$/i;

export const ZFS_ANCHOR_UPLOAD_EXPIRE_SECONDS = 3600;
