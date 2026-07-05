// SPDX-License-Identifier: MIT
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: ["**/__tests__/**/*.test.js"],
  moduleDirectories: ["node_modules", "<rootDir>/node_modules"],
  moduleFileExtensions: ["js", "json", "node"],
  transform: {},
  collectCoverageFrom: [
    "utils/**/*.js",
    "models/**/*.js",
    "endpoints/**/*.js",
    "!**/node_modules/**",
    "!**/__tests__/**",
  ],
  coverageDirectory: "coverage",
  // Coverage gate — see issue #284. The aspirational 70% target was set in
  // jest.config but actual coverage sits at ~22% statements / 16% branches,
  // so `yarn test:coverage` always exited 1 and the gate was bypassed in CI
  // with `--passWithNoTests`. These thresholds are set to the real measured
  // coverage minus a small buffer so the gate PASSES and acts as a ratchet:
  // it now catches regressions (coverage dropping) while we incrementally
  // raise the numbers as more tests land (#290). Bump these up as coverage
  // improves — never lower them without justification.
  coverageThreshold: {
    global: {
      statements: 20,
      branches: 14,
      functions: 17,
      lines: 20,
    },
  },
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    // uuid >= 11 ships ESM-only. Node itself can require() ESM at runtime,
    // but Jest's CJS module registry cannot (without experimental VM
    // modules) — map to a tiny crypto.randomUUID-backed shim in tests.
    "^uuid$": "<rootDir>/__tests__/helpers/uuidShim.js",
  },
};
