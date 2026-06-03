// packages/zfilesystem/examples/build-upload-actions/build-upload.mjs
import { buildUploadActions, chunkUint8Array, zfsEncodeDataBytes } from "zeos-zfilesystem";

const text = "Hello from zeos-zfilesystem example.\n";
const bytes = new TextEncoder().encode(text);
const chunks = chunkUint8Array(bytes, 64);

console.log("Encoded single chunk:", zfsEncodeDataBytes(chunks[0].data, "b122"));

const actions = buildUploadActions({
  contract: "zfilesystem",
  owner: "alice",
  filename: "examples/hello.txt",
  encoding: "b122",
  chunks,
});

console.log(JSON.stringify(actions, null, 2));
console.log("\nSign and submit these actions with Anchor, TokenPocket, or your wallet adapter.");
