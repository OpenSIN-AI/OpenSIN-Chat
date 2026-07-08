// SPDX-License-Identifier: MIT
// Purpose: Central data-access layer for application-wide system settings.
// Docs: server/models/systemSettings.doc.md
//
// This file was refactored as part of issue #510 (God-File split).
// The implementation is now split across focused modules in ./systemSettings/:
//   - constants.js  — static field lists and default prompt
//   - helpers.js    — shared utility functions (isNullOrNaN, mergeStringField, mergeConnections)
//   - validators.js — field validation functions (factory)
//   - getters.js    — read operations and feature checks (factory)
//   - mutations.js  — write/delete operations (factory)
//
// This file re-exports the assembled SystemSettings object so that all
// existing `require("./models/systemSettings")` calls continue to work
// without any changes.

process.env.NODE_ENV === "development"
  ? require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })
  : require("dotenv").config();

const { saneDefaultSystemPrompt, protectedFields, publicFields, supportedFields } = require("./systemSettings/constants");
const { createValidations } = require("./systemSettings/validators");
const { createGetters } = require("./systemSettings/getters");
const { createMutations } = require("./systemSettings/mutations");

// Build the SystemSettings object by merging constants, getters, and mutations.
// The factories receive the `SystemSettings` object itself so that methods
// can call each other (e.g. currentSettings calls isMultiUserMode).
const SystemSettings = {
  saneDefaultSystemPrompt,
  protectedFields,
  publicFields,
  supportedFields,
  simpleSSO: {
    /**
     * Gets the no login redirect URL. If the conditions below are not met, this will return null.
     * - If simple SSO is not enabled.
     * - If simple SSO login page is not disabled.
     * - If the no login redirect is not a valid URL or is not set.
     * @returns {string | null}
     */
    noLoginRedirect: () => {
      if (!("SIMPLE_SSO_ENABLED" in process.env)) return null;
      if (!("SIMPLE_SSO_NO_LOGIN" in process.env)) return null;
      if (!("SIMPLE_SSO_NO_LOGIN_REDIRECT" in process.env)) return null;

      try {
        let url = new URL(process.env.SIMPLE_SSO_NO_LOGIN_REDIRECT);
        return url.toString();
      } catch {}

      return null;
    },
  },
};

// Attach factory-created methods
const validations = createValidations(SystemSettings);
Object.assign(SystemSettings, createGetters(SystemSettings));
Object.assign(SystemSettings, createMutations(SystemSettings, validations));
SystemSettings.validations = validations;

module.exports.SystemSettings = SystemSettings;
