// Jest stub for native/optional peer dependencies that are not installed
// in the server test environment. Modules that require() these packages
// but whose functionality is not exercised in unit tests will get this
// empty object instead of a "Cannot find module" error.
module.exports = {};
