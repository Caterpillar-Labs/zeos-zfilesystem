# Changelog

## 0.1.1 - 2026-06-04

- Republish to fix npm registry package index (0.1.0 tarball existed but root document was missing)

## 0.1.0 - 2026-06-04

- Publish under npm scope `@caterpillar-labs/zeos-zfilesystem` (replaces unscoped `zeos-zfilesystem`)

## 0.1.0 - 2026-06-03

- Initial public release
- URI parse/build/normalize for `chain://fs@contract:/owner/path`
- Encodings: b64, hex, b122
- On-chain read: table `fs`, block trace decode, legacy `chunks` table
- Virtual directory tree helpers
- Transaction action builders: upload, rename, erase
- `createFetchZfsChainClient` RPC helper
