// SPDX-License-Identifier: MIT

interface ParsedWebSource {
  title: string;
  url: string;
  domain?: string;
}

function validHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseWebSources(output?: string): ParsedWebSource[] {
  if (!output) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return [];
  }

  const candidates = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as any)?.results)
      ? (parsed as any).results
      : Array.isArray((parsed as any)?.sources)
        ? (parsed as any).sources
        : [];

  return candidates
    .map((entry: any) => {
      const url = entry?.url || entry?.link;
      if (!validHttpUrl(url)) return null;
      return {
        title: String(entry?.title || entry?.name || new URL(url).hostname),
        url,
        domain: entry?.domain || new URL(url).hostname,
      };
    })
    .filter(Boolean) as ParsedWebSource[];
}
