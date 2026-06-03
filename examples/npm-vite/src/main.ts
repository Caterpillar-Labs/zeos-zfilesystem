// packages/zfilesystem/examples/npm-vite/src/main.ts
import { parseZFilesystemAssetUri, listZfsDirectoryChildren } from "zeos-zfilesystem";

const app = document.getElementById("app")!;

const uri = "jungle4://fs@zfilesystem:/alice/icons/logo.png";
const parsed = parseZFilesystemAssetUri(uri);
const listing = listZfsDirectoryChildren(["readme.txt", "icons/a.png", "icons/b.png"], "icons");

app.innerHTML = `
  <h1>zeos-zfilesystem Vite example</h1>
  <pre id="out"></pre>
`;

document.getElementById("out")!.textContent = JSON.stringify({ parsed, listing }, null, 2);
