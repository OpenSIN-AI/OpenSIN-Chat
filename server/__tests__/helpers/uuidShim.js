// SPDX-License-Identifier: MIT
// Purpose: CJS test shim for the ESM-only `uuid` v14 package.
// Node >= 22 can `require()` ESM at runtime, but Jest's module registry
// cannot without --experimental-vm-modules. This shim provides the tiny
// surface the server code actually uses (v4) via node:crypto.
// Wired up in jest.config.js moduleNameMapper — never used in production.

const { randomUUID } = require("crypto");

module.exports = {
  v4: () => randomUUID(),
};
