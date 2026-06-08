const path = require("path");
function getStoragePath(...subdirs) {
  const base = process.env.STORAGE_DIR || path.resolve(__dirname, "../../storage");
  return subdirs.length > 0 ? path.resolve(base, ...subdirs) : base;
}
module.exports = { getStoragePath };
