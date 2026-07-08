/* global jest */
// Manual Jest mock for dotenv.
// dotenv is not installed as a server dependency (the server uses its own
// environment loading). This stub prevents "Cannot find module 'dotenv'"
// errors when test files (or the modules they require) call require("dotenv").
module.exports = {
  config: jest.fn(),
};
