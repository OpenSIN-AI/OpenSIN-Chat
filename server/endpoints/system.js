// SPDX-License-Identifier: MIT
// Purpose: Thin router that delegates to sub-modules under server/endpoints/system/.
// Docs: server/endpoints/system.doc.md
process.env.NODE_ENV === "development"
  ? require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })
  : require("dotenv").config();

module.exports = require("./system/index");
