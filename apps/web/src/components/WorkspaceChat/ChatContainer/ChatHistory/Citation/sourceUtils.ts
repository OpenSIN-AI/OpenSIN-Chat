// SPDX-License-Identifier: MIT
// Purpose: Central source normalization helpers for chat citations.
// Docs: sourceUtils.doc.md

export type SourceIcon =
  | "file"
  | "link"
  | "youtube"
  | "github"
  | "gitlab"
  | "confluence"
  | "drupalwiki"
  | "obsidian"
  | "paperlessNgx"
  | "gmailThread"
  | "gmailAttachment"
  | "googleCalendar"
  | "outlookThread"
  | "outlookAttachment";

export type CitationChunk = {
  id?: string | number;
  text?: string;
  chunkSource?: string;
  score?: number | null;
};

export type CitationSource = {
  id?: string | number;
  title?: string;
  text?: string;
  chunkSource?: string;
  score?: number | null;
  chunks?: CitationChunk[];
  references?: number;
};

export type CombinedCitationSource = {
  title: string;
  chunks: CitationChunk[];
  references: number;
};

export type ParsedChunkSource = {
  isUrl: boolean;
  text: string | null;
  href: string | null;
  icon: SourceIcon;
};

const SOURCE_SCHEMES: Array<{
  scheme: string;
  icon: SourceIcon;
  useUrlLabel?: boolean;
}> = [
  { scheme: "link://", icon: "link", useUrlLabel: true },
  { scheme: "confluence://", icon: "confluence" },
  { scheme: "github://", icon: "github" },
  { scheme: "gitlab://", icon: "gitlab" },
  { scheme: "drupalwiki://", icon: "drupalwiki" },
  { scheme: "youtube://", icon: "youtube" },
  { scheme: "obsidian://", icon: "obsidian" },
  { scheme: "paperless-ngx://", icon: "paperlessNgx" },
  { scheme: "gmail-thread://", icon: "gmailThread" },
  { scheme: "gmail-attachment://", icon: "gmailAttachment" },
  { scheme: "google-calendar://", icon: "googleCalendar" },
  { scheme: "outlook-thread://", icon: "outlookThread" },
  { scheme: "outlook-attachment://", icon: "outlookAttachment" },
];

export function combineLikeSources(
  sources: CitationSource[] = [],
): CombinedCitationSource[] {
  const combined = new Map<string, CombinedCitationSource>();

  for (const source of sources) {
    const title =
      source.title?.trim() || source.chunkSource || "Unknown source";
    const current = combined.get(title);
    const chunk = {
      id: source.id,
      text: source.text,
      chunkSource: source.chunkSource || "",
      score: source.score ?? null,
    };

    if (current) {
      current.chunks.push(chunk);
      current.references += 1;
    } else {
      combined.set(title, {
        title,
        chunks: [chunk],
        references: 1,
      });
    }
  }

  return Array.from(combined.values());
}

export function parseChunkSource({
  title = "",
  chunks = [],
}: CitationSource | CombinedCitationSource = {}): ParsedChunkSource {
  const chunkSource = chunks[0]?.chunkSource || "";
  const fallback: ParsedChunkSource = {
    isUrl: false,
    text: null,
    href: null,
    icon: "file",
  };

  const match = SOURCE_SCHEMES.find(({ scheme }) =>
    chunkSource.startsWith(scheme),
  );
  if (!match) return fallback;

  const rawUrl = chunkSource.slice(match.scheme.length);
  try {
    const url = new URL(rawUrl);
    return {
      isUrl: true,
      href: url.toString(),
      text: match.useUrlLabel ? `${url.host}${url.pathname}` : title,
      icon: match.icon,
    };
  } catch {
    return { ...fallback, icon: match.icon };
  }
}
