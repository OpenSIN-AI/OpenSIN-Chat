// SPDX-License-Identifier: MIT
const { isIP } = require("net");

const PRIVATE_RANGES = [
  { net: "10.0.0.0", bits: 8 },
  { net: "172.16.0.0", bits: 12 },
  { net: "192.168.0.0", bits: 16 },
  { net: "127.0.0.0", bits: 8 },
  { net: "169.254.0.0", bits: 16 },
  { net: "0.0.0.0", bits: 8 },
  { net: "100.64.0.0", bits: 10 },
  { net: "198.18.0.0", bits: 15 },
];

function ipv4ToInt(ip) {
  const octets = ip.split(".").map(Number);
  return (
    ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0
  );
}

function isPrivateIPv4(ip) {
  if (isIP(ip) !== 4) return false;
  const addr = ipv4ToInt(ip);
  for (const range of PRIVATE_RANGES) {
    const net = ipv4ToInt(range.net);
    const mask = ~((1 << (32 - range.bits)) - 1);
    if ((addr & mask) === (net & mask)) return true;
  }
  return false;
}

function isPrivateIPv6(hostname) {
  // The WHATWG URL parser keeps IPv6 literals wrapped in brackets
  // (e.g. "[::1]"); strip them so net.isIP can recognise the address.
  const stripped = hostname.replace(/^\[/, "").replace(/\]$/, "");
  if (isIP(stripped) !== 6) return false;
  const normalized = stripped.toLowerCase();
  if (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("::ffff:")
  )
    return true;

  // IPv4-compatible IPv6 (e.g. ::192.168.1.1) and IPv4-mapped variants
  // written in dotted-quad form still embed a private IPv4 address.
  const ipv4Embed = normalized.match(
    /^::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/,
  );
  if (ipv4Embed && isPrivateIPv4(ipv4Embed[1])) return true;

  // IPv4-mapped/compatible addresses written in hex form, e.g.
  // ::ffff:7f00:1 (== 127.0.0.1) or ::7f00:1. Extract the trailing two
  // 16-bit hextets, rebuild the embedded IPv4 address and re-check it.
  const hexEmbed = normalized.match(
    /^::(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/,
  );
  if (hexEmbed) {
    const high = parseInt(hexEmbed[1], 16);
    const low = parseInt(hexEmbed[2], 16);
    const embedded = [
      (high >> 8) & 0xff,
      high & 0xff,
      (low >> 8) & 0xff,
      low & 0xff,
    ].join(".");
    if (isPrivateIPv4(embedded)) return true;
  }

  return false;
}

function validateUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid protocol");
  }
  const hostname = parsed.hostname;
  if (
    hostname === "localhost" ||
    hostname === "localhost.localdomain" ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Internal URLs not allowed");
  }
  if (isPrivateIPv4(hostname)) {
    throw new Error("Internal URLs not allowed");
  }
  if (isPrivateIPv6(hostname)) {
    throw new Error("Internal URLs not allowed");
  }
  return parsed;
}

module.exports = { validateUrl, isPrivateIPv4, isPrivateIPv6 };
