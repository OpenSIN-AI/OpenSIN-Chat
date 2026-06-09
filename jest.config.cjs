module.exports = {
  projects: [
    {
      displayName: "server",
      testMatch: ["<rootDir>/server/__tests__/**/*.test.js"],
    },
    {
      displayName: "collector",
      testMatch: ["<rootDir>/collector/__tests__/**/*.test.js"],
    },
  ],
};