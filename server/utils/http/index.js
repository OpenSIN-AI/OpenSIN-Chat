// SPDX-License-Identifier: MIT
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
  return typeof request.body === "string"
    ? JSON.parse(request.body)
    : request.body;
}

function queryParams(request) {
  return request.query;
}

/**
 * Creates a JWT with the given info and expiry
 * @param {object} info - The info to include in the JWT
 * @param {string} expiry - The expiry time for the JWT (default: 30 days)
 * @returns {string} The JWT
 */
function makeJWT(info = {}, expiry = "30d") {
  if (!process.env.JWT_SECRET)
    throw new Error("Cannot create JWT as JWT_SECRET is unset.");
  return JWT.sign(info, process.env.JWT_SECRET, { expiresIn: expiry });
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
  try {
    return JWT.verify(jwtToken, process.env.JWT_SECRET);
  } catch (e) {
    console.warn("JWT decode failed:", e.message);
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
  if (jsonString === null) return fallback;

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.debug("safeJsonParse: JSON.parse failed:", e.message);
  }

  if (jsonString?.startsWith("[") || jsonString?.startsWith("{")) {
    try {
      const repairedJson = jsonrepair(jsonString);
      return JSON.parse(repairedJson);
    } catch (e) {
      console.debug("safeJsonParse: jsonrepair failed:", e.message);
    }
  }

  try {
    return extractJsonFromString(jsonString)?.[0] || fallback;
  } catch (e) {
    console.debug("safeJsonParse: extract failed:", e.message);
  }

  return fallback;
}

function isValidUrl(urlString = "") {
  try {
    const url = new URL(urlString);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    return true;
  } catch (e) {
    console.debug("isValidUrl: invalid URL:", urlString, e.message);
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
