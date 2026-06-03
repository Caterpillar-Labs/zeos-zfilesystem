// packages/zfilesystem/examples/node-read/list-files.mjs
import { createFetchZfsChainClient, fetchFilesZFilesystem } from "@caterpillar-labs/zeos-zfilesystem";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(here, ".env"));

const rpcUrl = process.env.ZFS_RPC_URL?.trim();
const contract = process.env.ZFS_CONTRACT?.trim();
const owner = process.env.ZFS_OWNER?.trim();

if (!rpcUrl || !contract || !owner) {
  console.error("Set ZFS_RPC_URL, ZFS_CONTRACT, ZFS_OWNER in examples/node-read/.env");
  process.exit(1);
}

const client = createFetchZfsChainClient({ rpcUrl });
const files = await fetchFilesZFilesystem({ client, contract, owner });

console.log(`Found ${files.length} file(s) for ${owner}@${contract}:`);
for (const row of files.slice(0, 20)) {
  console.log(`- ${row.filename} (${row.chunks.length} chunk locator(s))`);
}
if (files.length > 20) {
  console.log(`... and ${files.length - 20} more`);
}
