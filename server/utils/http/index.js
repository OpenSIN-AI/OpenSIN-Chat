// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

process.env.NODE_ENV === "development"
  ? require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })
  : require("dotenv").config();
const JWT = require("jsonwebtoken");
const { User } = require("../../models/user");
const { jsonrepair } = require("jsonrepair");

// Replaces extract-json-from-string (abandoned, 8.5y old).
// Extracts the first JSON object or array from an arbitrary string.
function extractJsonFromString(str) {
  const results = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"') {
      // Skip quoted strings
      i++;
      while (i < str.length && str[i] !== '"') {
        if (str[i] === "\\") i++;
        i++;
      }
      continue;
    }
    if (char === "{" || char === "[") {
      if (depth === 0) start = i;
      depth++;
    } else if (char === "}" || char === "]") {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          const candidate = str.slice(start, i + 1);
          results.push(JSON.parse(candidate));
        } catch {
          // not valid JSON, ignore
        }
        start = -1;
      }
    }
  }
  return results;
}

function reqBody(request) {
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }
  return request.body;
}

function queryParams(request) {
  return request.query;
}

/**
 * Creates a JWT with the given info and expiry. Pins the algorithm to HS256
 * and embeds issuer/audience claims so that the verifier can detect tokens
 * minted with weaker settings.
 * @param {object} info - The info to include in the JWT
 * @param {string} expiry - The expiry time for the JWT (default: 30d)
 * @returns {string} The JWT
 */
function makeJWT(info = {}, expiry = null) {
  if (!process.env.JWT_SECRET)
    throw new Error("Cannot create JWT as JWT_SECRET is unset.");
  // Default to 30 days so sessions survive a normal work-week without forcing
  // re-login. The VM currently has no JWT_EXPIRY env var set, which previously
  // fell back to 15 minutes — far too short for production use.
  const ttl = expiry ?? process.env.JWT_EXPIRY ?? "30d";
  return JWT.sign(info, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: ttl,
    issuer: "opensin-chat",
    audience: "opensin-chat",
  });
}

/**
 * Gets the user from the session
 * Note: Only valid for multi-user mode
 * as single-user mode with password is not a "user"
 * @param {import("express").Request} request - The request object
 * @param {import("express").Response} response - The response object
 * @returns {Promise<import("@prisma/client").users | null>} The user
 */
async function userFromSession(request, response = null) {
  if (!!response && !!response.locals?.user) {
    return response.locals.user;
  }

  const auth = request.header("Authorization");
  const token = auth ? auth.split(" ")[1] : null;

  if (!token) {
    return null;
  }

  const valid = decodeJWT(token);
  if (!valid || !valid.id) {
    return null;
  }

  const user = await User.get({ id: valid.id });
  return user;
}

function decodeJWT(jwtToken) {
  if (!process.env.JWT_SECRET) {
    consoleLogger.warn("JWT decode skipped: JWT_SECRET is unset.");
    return { p: null, id: null, username: null };
  }
  try {
    return JWT.verify(jwtToken, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "opensin-chat",
      audience: "opensin-chat",
    });
  } catch (e) {
    consoleLogger.warn("JWT decode failed:", e.message);
  }
  return { p: null, id: null, username: null };
}

function multiUserMode(response) {
  return response?.locals?.multiUserMode;
}

function parseAuthHeader(headerValue = null, apiKey = null) {
  if (headerValue === null || apiKey === null) return {};
  if (headerValue === "Authorization")
    return { Authorization: `Bearer ${apiKey}` };
  return { [headerValue]: apiKey };
}

function safeJsonParse(jsonString, fallback = null) {
  if (jsonString === null || jsonString === undefined) return fallback;
  if (typeof jsonString !== "string") return jsonString;

  try {
    return JSON.parse(jsonString);
  } catch {
    // expected for markdown-wrapped JSON; fall through to repair/extract
  }

  if (jsonString.startsWith("[") || jsonString.startsWith("{")) {
    try {
      const repairedJson = jsonrepair(jsonString);
      return JSON.parse(repairedJson);
    } catch {
      // repair failed; fall through to extract
    }
  }

  try {
    return extractJsonFromString(jsonString)?.[0] || fallback;
  } catch {
    // all parse strategies exhausted
  }

  return fallback;
}

function isValidUrl(urlString = "") {
  try {
    const url = new URL(urlString);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    return true;
  } catch {
    // invalid URL — return false below
  }
  return false;
}

function toValidNumber(number = null, fallback = null) {
  if (isNaN(Number(number))) return fallback;
  return Number(number);
}

/**
 * Decode HTML entities from a string.
 * The DMR response is encoded with HTML entities, so we need to decode them
 * so we can parse the JSON and report the progress percentage.
 * @param {string} str - The string to decode.
 * @returns {string} The decoded string.
 */
function decodeHtmlEntities(str) {
  return str
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

module.exports = {
  reqBody,
  multiUserMode,
  queryParams,
  makeJWT,
  decodeJWT,
  userFromSession,
  parseAuthHeader,
  safeJsonParse,
  isValidUrl,
  toValidNumber,
  decodeHtmlEntities,
};
