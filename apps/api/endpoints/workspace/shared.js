// SPDX-License-Identifier: MIT
const { cleanupUploadedFile } = require("../../utils/files/multer");

const RESPONSE_CACHE_MAX = 50;
const responseCache = new Map();

function cacheSet(key, value) {
  responseCache.set(key, value);
  if (responseCache.size > RESPONSE_CACHE_MAX) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
}

function cleanupHotdirFile(request) {
  cleanupUploadedFile(request);
}

module.exports = { responseCache, cacheSet, cleanupHotdirFile };
