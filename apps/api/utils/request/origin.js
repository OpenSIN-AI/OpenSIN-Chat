// SPDX-License-Identifier: MIT

/**
 * Decide whether a mutating browser request's Origin is acceptable.
 *
 * Reverse proxies commonly terminate TLS before forwarding plain HTTP to the
 * application. Scheme equality is therefore not a reliable same-origin test at
 * the app boundary. The browser-supplied Origin and forwarded Host must still
 * name the exact same authority; only http/https origins are eligible.
 *
 * @param {object} options
 * @param {string} options.origin
 * @param {string} options.requestHost
 * @param {string[]} [options.explicitOrigins]
 * @returns {boolean}
 */
function isAllowedMutatingOrigin({
  origin,
  requestHost,
  explicitOrigins = [],
}) {
  if (typeof origin !== "string" || typeof requestHost !== "string") {
    return false;
  }

  let parsedOrigin;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(parsedOrigin.protocol)) return false;
  if (parsedOrigin.username || parsedOrigin.password) return false;

  const normalizedHost = requestHost.trim().toLowerCase();
  if (!normalizedHost) return false;

  if (parsedOrigin.host.toLowerCase() === normalizedHost) return true;

  const normalizedOrigin = parsedOrigin.origin.toLowerCase();
  return explicitOrigins.some((candidate) => {
    if (typeof candidate !== "string" || !candidate.trim()) return false;
    try {
      const parsedCandidate = new URL(candidate.trim());
      return (
        ["http:", "https:"].includes(parsedCandidate.protocol) &&
        !parsedCandidate.username &&
        !parsedCandidate.password &&
        parsedCandidate.origin.toLowerCase() === normalizedOrigin
      );
    } catch {
      return false;
    }
  });
}

module.exports = { isAllowedMutatingOrigin };
