/* global jest */
// SPDX-License-Identifier: MIT
// Mock buffer-equal-constant-time for Node.js 18+ compatibility
// This package is deprecated and doesn't work with newer Node.js versions
jest.mock("buffer-equal-constant-time", () => {
  return (a, b) => {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  };
});
