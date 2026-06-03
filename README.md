# @caterpillar-labs/zeos-zfilesystem

Protocol SDK for the Zeos **zfilesystem** contract: URI scheme, data encodings, on-chain read/decode, virtual directory tree, and EOSIO action builders.

Published under [Caterpillar-Labs](https://github.com/Caterpillar-Labs) alongside [`zeos-link`](https://github.com/Caterpillar-Labs/zeos-link).

npm: `@caterpillar-labs/zeos-zfilesystem` (replaces deprecated unscoped `zeos-zfilesystem`).

This package is **UI-free** and **wallet-free**. Bring your own RPC client (`ZfsChainClient`) and transaction signer.

---

## TL;DR for humans and AI agents

Use this package when a web app or script needs to:

- parse or build `zfilesystem` asset URIs,
- list virtual directories from flat on-chain filenames,
- read/decode file bytes from chain traces,
- build `upload` / `rename` / `erase` EOSIO actions.

Core flow:

```ts
import {
  parseZFilesystemAssetUri,
  createFetchZfsChainClient,
  fetchFilesZFilesystem,
  buildUploadActions,
  chunkFile,
} from "@caterpillar-labs/zeos-zfilesystem";

const parsed = parseZFilesystemAssetUri("jungle4://fs@zfilesystem:/alice/readme.txt");

const client = createFetchZfsChainClient({ rpcUrl: "https://your-node.example" });
const files = await fetchFilesZFilesystem({
  client,
  contract: "zfilesystem",
  owner: "alice",
});

const uploadActions = buildUploadActions({
  contract: "zfilesystem",
  owner: "alice",
  filename: "docs/guide.html",
  encoding: "b122",
  chunks: await chunkFile(file, 128_000),
});
```

Important:

- Peer dependency: `@wharfkit/antelope` (ABI decode for block traces).
- The SDK builds neutral EOSIO actions; signing/submitting is your app's job.
- Chunk bytes live in block traces (top-level `upload` actions), not in RAM.
- On-chain filenames are flat paths (`icons/a.png`); directories are client-side only.

---

## Installation

```bash
npm install @caterpillar-labs/zeos-zfilesystem @wharfkit/antelope
```

---

## Usage with npm / bundlers

```ts
import { parseZFilesystemAssetUri, listZfsDirectoryChildren } from "@caterpillar-labs/zeos-zfilesystem";
```

---

## Usage as a browser ES module

Copy the built browser file into your public assets and import it directly:

```html
<script type="module">
  import { parseZFilesystemAssetUri } from "/zeos-zfilesystem.js";

  const parsed = parseZFilesystemAssetUri("jungle4://fs@zfilesystem:/alice/readme.txt");
</script>
```

When installed from npm, the browser ESM build is available at:

```txt
node_modules/@caterpillar-labs/zeos-zfilesystem/dist/zeos-zfilesystem.js
```

Or via the export subpath:

```ts
import { parseZFilesystemAssetUri } from "@caterpillar-labs/zeos-zfilesystem/browser";
```

---

## Usage as a global browser script

```html
<script src="/zeos-zfilesystem.global.js"></script>
<script>
  const parsed = ZEOSZFilesystem.parseZFilesystemAssetUri("jungle4://fs@zfilesystem:/alice/readme.txt");
</script>
```

Prefer the ESM build for modern apps.

---

## URI scheme

```txt
<chainName>://fs@<contract>:/<owner>/<relative/path>
```

Examples:

- `jungle4://fs@zfilesystem:/alice/readme.txt`
- `vaulta://fs@zfilesystem:/bob/icons/logo.png`

```typescript
import { parseZFilesystemAssetUri, buildZFilesystemAssetUriFromContext } from "@caterpillar-labs/zeos-zfilesystem";

const parsed = parseZFilesystemAssetUri("jungle4://fs@zfilesystem:/alice/readme.txt");

const uri = buildZFilesystemAssetUriFromContext(
  { chainName: "jungle4", rpcUrl: "https://...", zfilesystemContract: "zfilesystem" },
  "alice",
  "readme.txt",
);
```

---

## Chain client

```typescript
import {
  createFetchZfsChainClient,
  fetchFilesZFilesystem,
  fetchFileContentZFilesystemWithEncoding,
} from "@caterpillar-labs/zeos-zfilesystem";

const client = createFetchZfsChainClient({ rpcUrl: "https://your-node.example" });

const files = await fetchFilesZFilesystem({
  client,
  contract: "zfilesystem",
  owner: "alice",
});

const content = await fetchFileContentZFilesystemWithEncoding({
  client,
  contract: "zfilesystem",
  owner: "alice",
  filename: "readme.txt",
  chunkIds: files.find((f) => f.filename === "readme.txt")?.chunks ?? [],
});
```

Implement `ZfsChainClient` to plug into your own RPC layer (failover, auth, etc.).

---

## Upload / rename / erase (action builders)

```typescript
import { buildUploadActions, buildRenameAction, buildEraseAction, chunkFile } from "@caterpillar-labs/zeos-zfilesystem";

const chunks = await chunkFile(file, 128_000);

const uploadActions = buildUploadActions({
  contract: "zfilesystem",
  owner: "alice",
  filename: "docs/guide.html",
  encoding: "b122",
  chunks,
});

const renameAction = buildRenameAction({
  contract: "zfilesystem",
  owner: "alice",
  filename: "old.txt",
  newFilename: "new.txt",
});

const eraseAction = buildEraseAction({
  contract: "zfilesystem",
  owner: "alice",
  filename: "old.txt",
});
```

---

## Encodings

| Prefix | Format |
|--------|--------|
| `b64:` | Base64 |
| `hex:` | Hexadecimal |
| `b122:` | Base122 (compact binary transport) |

```typescript
import { zfsEncodeDataBytes } from "@caterpillar-labs/zeos-zfilesystem";

const encoded = zfsEncodeDataBytes(new TextEncoder().encode("hello"), "b122");
```

---

## Virtual directory tree

```typescript
import { listZfsDirectoryChildren } from "@caterpillar-labs/zeos-zfilesystem";

const { directories, files } = listZfsDirectoryChildren(
  ["readme.txt", "icons/a.png", "icons/b.png"],
  "icons",
);
```

---

## Contract alignment

Actions and tables match `zfilesystem` in the Zeos contracts reference:

- Actions: `upload`, `rename`, `erase`
- Table: `fs` (scope: owner)
- Legacy table: `chunks` (optional, for older deployments)

---

## What this SDK does not do

This SDK does **not**:

- manage React state or explorer UI,
- sign or submit transactions,
- choose the app's active network,
- replace server-side authorization.

Keep those responsibilities in your app.

---

## Development

Install dependencies:

```bash
npm install
```

Typecheck:

```bash
npm run typecheck
```

Run tests:

```bash
npm test
```

Build:

```bash
npm run build
```

The build outputs:

```txt
dist/index.mjs
dist/index.cjs
dist/index.d.ts
dist/index.d.cts
dist/zeos-zfilesystem.js
dist/zeos-zfilesystem.min.js
dist/zeos-zfilesystem.global.js
```

Examples: see [`examples/README.md`](examples/README.md).

---

## Smoke test package exports

From outside the repo:

```bash
mkdir /tmp/zeos-zfilesystem-smoke
cd /tmp/zeos-zfilesystem-smoke
npm init -y
npm install @caterpillar-labs/zeos-zfilesystem @wharfkit/antelope
```

Test ESM:

```bash
node -e "import('@caterpillar-labs/zeos-zfilesystem').then(m => console.log(typeof m.parseZFilesystemAssetUri))"
```

Expected:

```txt
function
```

Test CJS:

```bash
node -e "const m = require('@caterpillar-labs/zeos-zfilesystem'); console.log(typeof m.parseZFilesystemAssetUri)"
```

Expected:

```txt
function
```

---

## Publishing

Before publishing:

```bash
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

Publish:

```bash
npm publish
```

Tag release:

```bash
git tag v0.1.0
git push origin main --tags
```

---

## License

MIT
