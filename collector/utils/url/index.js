// SPDX-License-Identifier: MIT
const RuntimeSettings = require("../runtimeSettings");
const dns = require("node:dns").promises;
const net = require("node:net");
/**
 * SSRF Protection
 *
 * This validator blocks internal and metadata-network targets by default:
 *   - All RFC 1918 private ranges (10.x, 172.16-31.x, 192.168.x)
 *   - Loopback (127.x, ::1)
 *   - Link-local (169.254.x, fe80::) — includes AWS/GCP metadata endpoint
 *   - Cloud metadata endpoints (169.254.169.254 explicitly)
 *   - IPv6 private ranges (::1, fc00::/7, fe80::/10)
 *   - 0.0.0.0 (wildcard bind)
 *
 * Can be bypassed via COLLECTOR_ALLOW_ANY_IP for self-hosted setups
 * where the user intentionally scrapes local services.
 */

const VALID_PROTOCOLS = ["https:", "http:"];
const runtimeSettings = new RuntimeSettings();

/**
 * Check if an IPv4 address is private/reserved.
 * @param {string} ip — dotted-quad IPv4
 * @returns {boolean} true if the IP should be blocked
 */
function isPrivateIPv4(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255))
    return true;

  const [a, b, c] = parts;

  // 0.0.0.0/8 — wildcard / "this host"
  if (a === 0) return true;
  // 10.0.0.0/8 — RFC 1918
  if (a === 10) return true;
  // 127.0.0.0/8 — loopback
  if (a === 127) return true;
  // 169.254.0.0/16 — link-local (includes 169.254.169.254 cloud metadata)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 — RFC 1918 (172.16.x – 172.31.x)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 — RFC 1918
  if (a === 192 && b === 168) return true;
  // 100.64.0.0/10 — CGNAT
  if (a === 100 && b >= 64 && b <= 127) return true;
  // IETF protocol assignments, documentation, 6to4 relay anycast.
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 192 && b === 88 && c === 99) return true;
  // Benchmarking and documentation networks.
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  // Multicast and reserved.
  if (a >= 224) return true;

  return false;
}

/**
 * Check if an IPv6 address is private/reserved.
 * @param {string} ip — colon-separated IPv6
 * @returns {boolean} true if the IP should be blocked
 */
function expandIPv6(ip) {
  let normalized = ip.toLowerCase().split("%")[0];
  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");
    const ipv4 = normalized.slice(lastColon + 1);
    const parts = ipv4.split(".").map(Number);
    if (
      parts.length !== 4 ||
      parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
    )
      return null;
    normalized = `${normalized.slice(0, lastColon)}:${(
      (parts[0] << 8) |
      parts[1]
    ).toString(16)}:${((parts[2] << 8) | parts[3]).toString(16)}`;
  }

  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const allParts = [...left, ...right];
  if (allParts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;

  if (halves.length === 1) {
    if (allParts.length !== 8) return null;
    return allParts.map((part) => Number.parseInt(part, 16));
  }

  const missing = 8 - allParts.length;
  if (missing < 1) return null;
  return [
    ...left.map((part) => Number.parseInt(part, 16)),
    ...Array(missing).fill(0),
    ...right.map((part) => Number.parseInt(part, 16)),
  ];
}

function embeddedIPv4(high, low) {
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

function isPrivateIPv6(ip) {
  const parts = expandIPv6(ip);
  if (!parts) return true;

  if (parts.every((part) => part === 0)) return true;
  if (parts.slice(0, 7).every((part) => part === 0) && parts[7] === 1)
    return true;

  const first = parts[0];
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((first & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local
  if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (first === 0x2001 && parts[1] === 0x0db8) return true; // documentation
  if (first === 0x2001 && parts[1] === 0x0002) return true; // benchmarking

  const mappedOrCompatible =
    parts.slice(0, 5).every((part) => part === 0) &&
    (parts[5] === 0 || parts[5] === 0xffff);
  if (mappedOrCompatible)
    return isPrivateIPv4(embeddedIPv4(parts[6], parts[7]));

  // NAT64 well-known prefix 64:ff9b::/96.
  if (
    parts[0] === 0x0064 &&
    parts[1] === 0xff9b &&
    parts.slice(2, 6).every((part) => part === 0)
  )
    return isPrivateIPv4(embeddedIPv4(parts[6], parts[7]));

  // 6to4 embeds an IPv4 destination directly after 2002::/16.
  if (first === 0x2002)
    return isPrivateIPv4(embeddedIPv4(parts[1], parts[2]));

  return false;
}

/**
 * If an ip address is passed in the user is attempting to collector some internal service running on internal/private IP.
 * Can be bypassed via COLLECTOR_ALLOW_ANY_IP environment variable.
 * @param {URL} param0
 * @param {URL['hostname']} param0.hostname
 * @returns {boolean}
 */
function allowAnyIp() {
  if (!runtimeSettings.get("allowAnyIp")) return false;
  if (!runtimeSettings.get("seenAnyIpWarning")) {
    // eslint-disable-next-line no-console
    console.warn(
      "\x1b[33mURL IP local address restrictions have been disabled by administrator!\x1b[0m",
    );
    runtimeSettings.set("seenAnyIpWarning", true);
  }
  return true;
}

function isPrivateAddress(address) {
  const normalized = String(address).replace(/^\[|\]$/g, "").split("%")[0];
  const family = net.isIP(normalized);
  if (family === 4) return isPrivateIPv4(normalized);
  if (family === 6) return isPrivateIPv6(normalized);
  return true;
}

function isInvalidIp({ hostname }) {
  if (allowAnyIp()) return false;
  const normalized = String(hostname).replace(/^\[|\]$/g, "").split("%")[0];
  return net.isIP(normalized) ? isPrivateAddress(normalized) : false;
}

/**
 * Resolve a URL hostname and reject it when any returned address is private,
 * reserved, loopback, link-local, multicast, or otherwise non-public.
 * Re-run this immediately before every network request and redirect hop.
 * @param {string} url
 * @returns {Promise<boolean>}
 */
async function assertSafeURL(url) {
  if (!validURL(url)) return false;
  if (allowAnyIp()) return true;

  try {
    const { hostname } = new URL(url);
    const normalizedHostname = hostname.replace(/^\[|\]$/g, "").split("%")[0];
    if (net.isIP(normalizedHostname))
      return !isPrivateAddress(normalizedHostname);
    const addresses = await dns.lookup(normalizedHostname, {
      all: true,
      verbatim: true,
    });
    return (
      addresses.length > 0 &&
      addresses.every(({ address }) => !isPrivateAddress(address))
    );
  } catch (error) {
    console.warn(
      `[url] DNS validation failed for ${url}: ${error?.message || error}`,
    );
    return false;
  }
}

/**
 * Validates a URL strictly
 * - Checks the URL forms a valid URL
 * - Checks the URL is at least HTTP(S)
 * - Checks the URL is not an internal IP - can be bypassed via COLLECTOR_ALLOW_ANY_IP
 * @param {string} url
 * @returns {boolean}
 */
function validURL(url) {
  try {
    const destination = new URL(url);
    if (!VALID_PROTOCOLS.includes(destination.protocol)) return false;
    if (!destination.hostname || destination.username || destination.password)
      return false;
    if (isInvalidIp(destination)) return false;
    return true;
  } catch (e) {
    console.warn("[index] non-fatal error:", e?.message || e);
  }
  return false;
}

/**
 * Modifies a URL to be valid:
 * - Checks the URL is at least HTTP(S) so that protocol exists
 * - Checks the URL forms a valid URL
 * @param {string} url
 * @returns {string}
 */
function validateURL(url) {
  try {
    let destination = url.trim();
    // If the URL has a protocol, just pass through
    // If the URL doesn't have a protocol, assume https://
    if (destination.includes("://"))
      destination = new URL(destination).toString();
    else destination = new URL(`https://${destination}`).toString();

    // If the URL ends with a slash, remove it
    return destination.endsWith("/") ? destination.slice(0, -1) : destination;
  } catch {
    if (typeof url !== "string") return "";
    return url.trim();
  }
}

/**
 * Validate if a link is a valid YouTube video URL
 * - Checks youtu.be, youtube.com, m.youtube.com, music.youtube.com
 * - Embed video URLs
 * - Short URLs
 * - Live URLs
 * - Regular watch URLs
 * - Optional query parameters (including ?v parameter)
 *
 * Can be used to extract the video ID from a YouTube video URL via the returnVideoId parameter.
 * @param {string} link - The link to validate
 * @param {boolean} returnVideoId - Whether to return the video ID if the link is a valid YouTube video URL
 * @returns {boolean|string} - Whether the link is a valid YouTube video URL or the video ID if returnVideoId is true
 */
function validYoutubeVideoUrl(link, returnVideoId = false) {
  try {
    if (!link || typeof link !== "string") return false;
    let urlToValidate = link;

    if (!link.startsWith("http://") && !link.startsWith("https://")) {
      urlToValidate = "https://" + link;
      urlToValidate = new URL(urlToValidate).toString();
    }

    const regex =
      /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?(?:.*&)?v=|(?:live\/)?|shorts\/))([\w-]{11})(?:\S+)?$/;
    const match = urlToValidate.match(regex);
    if (returnVideoId) return match?.[1] ?? null;
    return !!match?.[1];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error validating YouTube video URL", error);
    return returnVideoId ? null : false;
  }
}

module.exports = {
  validURL,
  assertSafeURL,
  validateURL,
  validYoutubeVideoUrl,
};
