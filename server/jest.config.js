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
    // dotenv is not a server dependency — it is only used in scripts that
    // run outside of the server process (e.g. migrate-env-to-db.js). Map
    // it to a no-op stub so any module that requires("dotenv") at the top
    // level does not cause "Cannot find module" in Jest.
    "^dotenv$": "<rootDir>/__mocks__/dotenv.js",
    // Native/optional peer deps that are not installed in the test
    // environment. Map each to an empty stub so transitive requires
    // (e.g. vectorDbProviders → pg, http → jsonwebtoken) don't crash
    // test suites that don't exercise those code paths.
    // Prisma generated client — the utils/prisma module is mocked per-test;
    // this stub prevents the @prisma/client package from trying to connect
    // to a real database when loaded as a transitive dependency.
    "^@prisma/client$": "<rootDir>/__mocks__/prismaClient.js",
  },
  // Issue #373: forceExit ensures Jest terminates even if a stray timer
  // or DB handle keeps the event loop alive. --detectOpenHandles is added
  // to the test script in package.json so leaks are surfaced in CI output.
  forceExit: true,
  // Detect open handles so the "worker failed to exit gracefully" warning
  // includes a stack trace pointing at the offending resource.
  detectOpenHandles: true,
};
