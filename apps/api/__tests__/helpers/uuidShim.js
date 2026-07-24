// SPDX-License-Identifier: MIT
// Purpose: CJS test shim for the ESM-only `uuid` v14 package.
// Node >= 22 can `require()` ESM at runtime, but Jest's module registry
// cannot without --experimental-vm-modules. This shim provides the tiny
// surface the server code actually uses (v4) via node:crypto.
// Wired up in jest.config.js moduleNameMapper — never used in production.

const { randomUUID } = require("crypto");

// Mirrors uuid's validate() for the v1-v8 + NIL/MAX formats.
const UUID_REGEX =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

module.exports = {
  v4: () => randomUUID(),
  validate: (uuid) => typeof uuid === "string" && UUID_REGEX.test(uuid),
};
