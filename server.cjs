const path = require("node:path");
const { pathToFileURL } = require("node:url");

const entryUrl = pathToFileURL(path.resolve(__dirname, "backend/index.js")).href;

import(entryUrl).catch((error) => {
  console.error("[SERVER] Failed to start backend", error);
  process.exit(1);
});
