# Examples

Build the SDK from the repo root first:

```bash
npm install
npm run build
```

## npm-vite

Bundler example importing from the monorepo root (`file:../..`):

```bash
cd examples/npm-vite
npm install
npm run dev
```

## browser-module

Static HTML importing the built browser ESM file:

```txt
examples/browser-module/index.html
```

Open it with any static file server after `npm run build`, or open the file directly if your browser allows local module imports.

## browser-global

Static HTML using the IIFE global build (`ZEOSZFilesystem.*`):

```txt
examples/browser-global/index.html
```

## node-read

Read-only chain listing (needs a public RPC):

```bash
cd examples/node-read
cp .env.example .env
node list-files.mjs
```

## build-upload-actions

Build `upload` actions locally (no wallet, no network):

```bash
node examples/build-upload-actions/build-upload.mjs
```
