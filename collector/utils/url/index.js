// SPDX-License-Identifier: MIT
const RuntimeSettings = require("../runtimeSettings");
/**
 * SSRF Protection
 *
 * The original AnythingLLM comment said "please don't submit SSRF CVEs" —
 * we're fixing that now. This validator blocks:
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

  const [a, b] = parts;

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
  // 240.0.0.0/4 — reserved
  if (a >= 240) return true;

  return false;
}

/**
 * Check if an IPv6 address is private/reserved.
 * @param {string} ip — colon-separated IPv6
 * @returns {boolean} true if the IP should be blocked
 */
function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  // ::1 — loopback
  if (lower === "::1") return true;
  // :: — unspecified
  if (lower === "::") return true;
  // fe80::/10 — link-local
  if (lower.startsWith("fe80:") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
  // fc00::/7 — unique local (fc00:: – fdff::)
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  // ::ffff:0:0/96 — IPv4-mapped (check the embedded IPv4)
  const v4Mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) return isPrivateIPv4(v4Mapped[1]);
  return false;
}

/**
 * If an ip address is passed in the user is attempting to collector some internal service running on internal/private IP.
 * Can be bypassed via COLLECTOR_ALLOW_ANY_IP environment variable.
 * @param {URL} param0
 * @param {URL['hostname']} param0.hostname
 * @returns {boolean}
 */
function isInvalidIp({ hostname }) {
  if (runtimeSettings.get("allowAnyIp")) {
    if (!runtimeSettings.get("seenAnyIpWarning")) {
      // eslint-disable-next-line no-console
      console.warn(
        "\x1b[33mURL IP local address restrictions have been disabled by administrator!\x1b[0m"
      );
      runtimeSettings.set("seenAnyIpWarning", true);
    }
    return false;
  }

  const IPv4Regex = new RegExp(
    /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/i
  );

  const IPv6Regex = new RegExp(
    /^(([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}|([0-9a-f]{1,4}:){1,7}:|([0-9a-f]{1,4}:){1,6}:[0-9a-f]{1,4}|([0-9a-f]{1,4}:){1,5}(:[0-9a-f]{1,4}){1,2}|([0-9a-f]{1,4}:){1,4}(:[0-9a-f]{1,4}){1,3}|([0-9a-f]{1,4}:){1,3}(:[0-9a-f]{1,4}){1,4}|([0-9a-f]{1,4}:){1,2}(:[0-9a-f]{1,4}){1,5}|[0-9a-f]{1,4}:((:[0-9a-f]{1,4}){1,6})|:((:[0-9a-f]{1,4}){1,7}|:)|fe80:(:[0-9a-f]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])|([0-9a-f]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9]))$/i
  );

  // IPv4 check
  if (IPv4Regex.test(hostname)) {
    return isPrivateIPv4(hostname);
  }

  // IPv6 check
  if (IPv6Regex.test(hostname)) {
    return isPrivateIPv6(hostname);
  }

  // Not an IP address — passthrough (hostname will be resolved by the
  // HTTP client; DNS-rebinding protection would require a custom DNS
  // resolver, which is out of scope for this validator).
  return false;
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
    if (isInvalidIp(destination)) return false;
    return true;
  } catch (e) { console.warn("[index] non-fatal error:", e?.message || e); }
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
  validateURL,
  validYoutubeVideoUrl,
};
