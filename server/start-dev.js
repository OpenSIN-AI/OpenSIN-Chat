// SPDX-License-Identifier: MIT
// Minimal dev server starter - bypass swagger
process.env.NODE_ENV = process.env.NODE_ENV || "development";
process.env.SERVER_PORT = process.env.PORT || 8000;

// Start the app directly
require("./index.js");
