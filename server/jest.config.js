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
  // Coverage gate — Epic E1 (2026-06-23): raised to 70% for new/changed
  // code. Enforced via `yarn test:coverage` (jest --coverage). Regular
  // `yarn test` (jest --ci) does not collect coverage so thresholds are
  // not checked during normal development runs.
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};
