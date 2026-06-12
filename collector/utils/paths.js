const path = require("path");

function getStoragePath(...subdirs) {
  const base = process.env.STORAGE_DIR || path.resolve(__dirname, "../../server/storage");
  return subdirs.length > 0 ? path.resolve(base, ...subdirs) : base;
}

function getCollectorPath(...subdirs) {
  const base = process.env.STORAGE_DIR
    ? path.resolve(process.env.STORAGE_DIR, "../../collector")
    : path.resolve(__dirname, "../..");
  return subdirs.length > 0 ? path.resolve(base, ...subdirs) : base;
}

module.exports = { getStoragePath, getCollectorPath };
