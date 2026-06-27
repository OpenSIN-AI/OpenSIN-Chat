// SPDX-License-Identifier: MIT
module.exports = {
  projects: [
    {
      displayName: "server",
      testMatch: ["<rootDir>/server/__tests__/**/*.test.js"],
      setupFiles: ["<rootDir>/server/jest.setup.js"],
    },
    {
      displayName: "collector",
      testMatch: ["<rootDir>/collector/__tests__/**/*.test.js"],
    },
  ],
};