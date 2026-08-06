// SPDX-License-Identifier: MIT
// Purpose: Validate/normalize agent-generated citation URLs before they are
// rendered as clickable links, so malformed or hallucinated citations are not
// turned into misleading links.
// Docs: citationHref.doc.md

const HOSTNAME_LABEL_RE =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

// Common web file extensions. A path segment ending in one of these is a
// filename (e.g. "test-net.xhtml", "rfc5737.txt"), not a hallucinated host.
const FILE_EXTENSIONS = new Set([
  "html",
  "htm",
  "xhtml",
  "txt",
  "pdf",
  "json",
  "xml",
  "css",
  "js",
  "mjs",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "ico",
  "avif",
  "md",
  "csv",
  "yaml",
  "yml",
  "doc",
  "docx",
  "zip",
  "gz",
  "tgz",
  "tar",
  "wasm",
  "mp4",
  "mp3",
  "wav",
  "ogg",
  "sql",
  "php",
  "rss",
  "atom",
  "ttf",
  "woff",
  "woff2",
  "ics",
  "eot",
  "map",
  "sh",
  "cgi",
]);

function hasWhitespace(value: string): boolean {
  return /\s/.test(value);
}

/**
 * A path segment shaped like a multi-label hostname (3+ dot-separated labels
 * that is not a filename, e.g. "reserved.dreams.direct") is a strong signal
 * that an agent hallucinated a domain and concatenated it onto a real URL
 * path. Legitimate IANA/RFC citation URLs use 1-2 label segments such as
 * "test-net.xhtml" or "rfc5737.txt".
 */
function isHostnameShapedSegment(segment: string): boolean {
  if (segment.length === 0 || !segment.includes(".")) return false;
  const labels = segment.split(".");
  if (labels.length < 3) return false;
  const last = labels[labels.length - 1]?.toLowerCase() ?? "";
  if (!last || FILE_EXTENSIONS.has(last)) return false;
  return HOSTNAME_LABEL_RE.test(segment);
}

/**
 * Validate a URL found in agent markdown output.
 *
 * Returns the original href string when it is safe to render as a clickable
 * link, or null when it must not be (relative/malformed, non-http(s), a
 * hostname hallucinated into the path, or a hostname label that disagrees
 * with the destination host). Callers render the label as plain text instead.
 */
export function sanitizeCitationHref(
  rawHref: string | null | undefined,
  labelText: string,
): string | null {
  if (!rawHref) return null;

  let url: URL;
  try {
    url = new URL(rawHref);
  } catch {
    return null; // relative or malformed URL — do not linkify
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || hasWhitespace(host)) {
    return null;
  }

  // Label/destination consistency: if the label itself is a hostname, it must
  // match the destination host (or be a subdomain of it).
  const label = String(labelText ?? "")
    .trim()
    .toLowerCase();
  if (HOSTNAME_LABEL_RE.test(label)) {
    const matchesHost = label === host || host.endsWith(`.${label}`);
    if (!matchesHost) return null;
  }

  // Reject hostnames hallucinated into the URL path.
  for (const segment of url.pathname.split("/")) {
    if (isHostnameShapedSegment(segment)) return null;
  }

  return rawHref;
}
