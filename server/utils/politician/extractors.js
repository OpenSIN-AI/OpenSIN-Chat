// SPDX-License-Identifier: MIT
/**
 * Politician raw-data extractors.
 *
 * Purpose: Shared helpers that parse raw Abgeordnetenwatch and Bundestag (DIP)
 * records to derive `state`, `party`, and `profileUrl`. Used by the sync job and
 * by the one-time backfill repair script.
 *
 * Docs: extractors.doc.md
 */

/**
 * Map a Bundestag Wahlkreis number to its German state (Bundesland).
 * Based on the official 2021 Wahlkreiseinteilung by Bundeswahlleiterin.
 * @param {number|string} number
 * @returns {string|null}
 */
function constituencyNumberToState(number) {
  const n = parseInt(number, 10);
  if (Number.isNaN(n)) return null;
  if (n >= 1 && n <= 11) return "Schleswig-Holstein";
  if (n >= 12 && n <= 17) return "Mecklenburg-Vorpommern";
  if (n >= 18 && n <= 23) return "Hamburg";
  if (n >= 24 && n <= 53) return "Niedersachsen";
  if (n >= 54 && n <= 55) return "Bremen";
  if (n >= 56 && n <= 65) return "Brandenburg";
  if (n >= 66 && n <= 74) return "Sachsen-Anhalt";
  if (n >= 75 && n <= 86) return "Berlin";
  if (n >= 87 && n <= 150) return "Nordrhein-Westfalen";
  if (n >= 151 && n <= 166) return "Sachsen";
  if (n >= 167 && n <= 188) return "Hessen";
  if (n >= 189 && n <= 196) return "Thüringen";
  if (n >= 197 && n <= 211) return "Rheinland-Pfalz";
  if (n >= 212 && n <= 257) return "Bayern";
  if (n >= 258 && n <= 295) return "Baden-Württemberg";
  if (n >= 296 && n <= 299) return "Saarland";
  return null;
}

function extractConstituencyNumber(label) {
  if (!label) return null;
  const match = String(label).match(/^\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract the German state (Bundesland) from an Abgeordnetenwatch raw mandate.
 * Prefers the electoral_list label, falls back to the constituency number.
 * @param {string|Object} rawData
 * @returns {string|null}
 */
function extractStateFromAwRawData(rawData) {
  try {
    const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    const listLabel = data?.electoral_data?.electoral_list?.label || "";
    const listMatch = listLabel.match(/Landesliste\s+(.+?)\s*\(/i);
    if (listMatch) return listMatch[1].trim();
    const constituencyLabel = data?.electoral_data?.constituency?.label || "";
    const number = extractConstituencyNumber(constituencyLabel);
    return number ? constituencyNumberToState(number) : null;
  } catch {
    return null;
  }
}

/**
 * Extract the human-readable Abgeordnetenwatch profile URL from the raw
 * candidacy-mandate object. The API URL is stored in `politicianApiUrl`, but the
 * public profile page is at `politician.abgeordnetenwatch_url`.
 * @param {string|Object} rawData
 * @returns {string|null}
 */
function extractProfileUrlFromAwRawData(rawData) {
  try {
    const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    return data?.politician?.abgeordnetenwatch_url || null;
  } catch {
    return null;
  }
}

/**
 * Extract the German state (Bundesland) from a Bundestag (DIP) raw record.
 * Some DIP person records contain a `person_roles` array with a `bundesland`
 * field (e.g. Ministerpräsidenten, Staatssekretäre). We prefer the most recent
 * role with a `bundesland` value.
 * @param {string|Object} rawData
 * @returns {string|null}
 */
function extractStateFromBundestagRawData(rawData) {
  try {
    const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    const roles = data?.person_roles;
    if (Array.isArray(roles)) {
      for (const role of roles) {
        if (role?.bundesland) return role.bundesland.trim();
      }
    }
    if (data?.bundesland) return data.bundesland.trim();
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract the party/faction from a Bundestag (DIP) raw record.
 * DIP person records store the faction in `person_roles[].fraktion`. The
 * sync-politician-data fallback historically did not copy this to the `party`
 * column, so this helper repairs `party` for Bundestag records.
 * @param {string|Object} rawData
 * @returns {string|null}
 */
function extractPartyFromBundestagRawData(rawData) {
  try {
    const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    const roles = data?.person_roles;
    if (Array.isArray(roles)) {
      for (const role of roles) {
        if (role?.fraktion) return role.fraktion.trim();
      }
    }
    if (data?.fraktion) return data.fraktion.trim();
    return null;
  } catch {
    return null;
  }
}

module.exports = {
  constituencyNumberToState,
  extractConstituencyNumber,
  extractStateFromAwRawData,
  extractProfileUrlFromAwRawData,
  extractStateFromBundestagRawData,
  extractPartyFromBundestagRawData,
};
