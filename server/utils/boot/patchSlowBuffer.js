// SPDX-License-Identifier: MIT
// Purpose: Shim Buffer.SlowBuffer for Node ≥18 where the deprecated SlowBuffer
//          constructor was removed. Required by the legacy `buffer-equal-constant-time`
//          package (transitive dep of `jsonwebtoken`) which reads
//          `SlowBuffer.prototype.equal` at module-load time.
// Docs: patchSlowBuffer.doc.md

const LOG_PREFIX = "\x1b[36m[SlowBuffer Shim]\x1b[0m";

/**
 * Patches `Buffer.SlowBuffer` onto the global Buffer object if it is missing
 * (Node ≥18 removed the deprecated SlowBuffer constructor). The shim exposes
 * a class whose prototype is a fresh object so that legacy packages reading
 * `SlowBuffer.prototype.equal` at require-time no longer throw
 * `TypeError: Cannot read properties of undefined (reading 'prototype')`.
 *
 * Must be called before `jsonwebtoken` (or any of its transitive deps) is
 * required.
 */
function patchSlowBuffer() {
  if (typeof Buffer.SlowBuffer !== "undefined") return;

  class SlowBuffer extends Buffer {}
  SlowBuffer.prototype.equal = function equal(that) {
    if (!Buffer.isBuffer(that)) return false;
    if (this.length !== that.length) return false;
    let c = 0;
    for (let i = 0; i < this.length; i++) {
      c |= this[i] ^ that[i];
    }
    return c === 0;
  };

  // Must set BOTH: the static property on the Buffer constructor (used by
  // modern code) AND the module-exports property (used by `var SlowBuffer =
  // require('buffer').SlowBuffer` in legacy packages like
  // `buffer-equal-constant-time`).
  Buffer.SlowBuffer = SlowBuffer;
  const bufferModule = require("buffer");
  bufferModule.SlowBuffer = SlowBuffer;

  // eslint-disable-next-line no-console
  console.log(
    `${LOG_PREFIX} Buffer.SlowBuffer shim installed (Node ${process.versions.node})`,
  );
}

module.exports = patchSlowBuffer;
