// SPDX-License-Identifier: MIT
//
// Central resolver for the Bundestag DIP API key.
//
// Since 2024 the DIP API (https://search.dip.bundestag.de/api/v1) rejects
// unauthenticated requests with HTTP 401. The Bundestag publishes a PUBLIC API
// key on its help page (https://dip.bundestag.de/über-dip/hilfe/api) that any
// consumer may use; it is intentionally not a secret. We ship it as the final
// fallback so a fresh deployment has working DIP access out of the box without
// anyone having to set an env var — while still letting operators override it
// via BUNDESTAG_DIP_API_KEY (preferred), BUNDESTAG_API_KEY, or DIP_API_KEY.
//
// Keep this value in sync with collector/utils/extensions/BundestagDrucksachen.

/** Public DIP API key published by the Bundestag. Not a secret. */
const DEFAULT_DIP_API_KEY = "R2BZaee.DjdCyihKZMf8AOjtScubP2EVydegzjmBIQ";

/**
 * Resolve the effective DIP API key, honouring env overrides first and falling
 * back to the published public key so the API is never silently 401.
 * @param {string|null} [override] - explicit key from a caller/opts
 * @returns {string}
 */
function resolveDipApiKey(override = null) {
  return (
    override ||
    process.env.BUNDESTAG_DIP_API_KEY ||
    process.env.BUNDESTAG_API_KEY ||
    process.env.DIP_API_KEY ||
    DEFAULT_DIP_API_KEY
  );
}

module.exports = { DEFAULT_DIP_API_KEY, resolveDipApiKey };
