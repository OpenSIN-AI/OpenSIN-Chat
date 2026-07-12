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
  id: string;
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

type CitationLike = Partial<Omit<CitationSource, "id">> &
  Partial<Omit<CombinedCitationSource, "id">> & { id?: string | number };

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numericScore(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

export function getCitationChunks(source: CitationLike = {}): CitationChunk[] {
  const rawChunks = Array.isArray(source.chunks) ? source.chunks : [];

  if (rawChunks.length > 0) {
    const normalizedChunks = rawChunks.filter(isRecord).map((chunk) => ({
      id: (chunk.id as string | number | undefined) ?? source.id,
      text: stringValue(chunk.text, stringValue(source.text)),
      chunkSource: stringValue(
        chunk.chunkSource,
        stringValue(source.chunkSource),
      ),
      score: numericScore(chunk.score) ?? numericScore(source.score),
    }));

    if (normalizedChunks.length > 0) return normalizedChunks;
  }

  return [
    {
      id: source.id,
      text: stringValue(source.text),
      chunkSource: stringValue(source.chunkSource),
      score: numericScore(source.score),
    },
  ];
}

function sourceTitle(source: CitationLike, chunks: CitationChunk[]) {
  return (
    stringValue(source.title).trim() ||
    stringValue(chunks[0]?.chunkSource).trim() ||
    "Unknown source"
  );
}

function sourceReferenceCount(source: CitationLike, chunks: CitationChunk[]) {
  if (typeof source.references === "number" && source.references > 0)
    return source.references;
  return Math.max(1, chunks.length);
}

function sourceGroupKey(title: string, chunks: CitationChunk[]) {
  return `${title}\u0000${chunks[0]?.chunkSource || ""}`;
}

export function combineLikeSources(
  sources: CitationSource[] = [],
): CombinedCitationSource[] {
  const combined = new Map<string, CombinedCitationSource>();

  for (const source of sources.filter(isRecord)) {
    const chunks = getCitationChunks(source);
    const title = sourceTitle(source, chunks);
    const references = sourceReferenceCount(source, chunks);
    const groupKey = sourceGroupKey(title, chunks);
    const current = combined.get(groupKey);

    if (current) {
      current.chunks.push(...chunks);
      current.references += references;
    } else {
      combined.set(groupKey, {
        id: groupKey,
        title,
        chunks,
        references,
      });
    }
  }

  return Array.from(combined.values());
}

export function parseChunkSource({
  title = "",
  chunks = [],
  ...source
}: CitationSource | CombinedCitationSource = {}): ParsedChunkSource {
  const normalizedChunks = getCitationChunks({ title, chunks, ...source });
  const chunkSource = normalizedChunks[0]?.chunkSource || "";
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
