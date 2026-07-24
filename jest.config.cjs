// SPDX-License-Identifier: MIT
module.exports = {
  projects: [
    {
      displayName: "api",
      testMatch: ["<rootDir>/apps/api/__tests__/**/*.test.js"],
      setupFiles: ["<rootDir>/apps/api/jest.setup.js"],
    },
    {
      displayName: "worker",
      testMatch: ["<rootDir>/apps/worker/__tests__/**/*.test.js"],
    },
  ],
};