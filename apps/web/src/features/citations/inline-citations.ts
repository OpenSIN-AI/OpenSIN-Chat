// SPDX-License-Identifier: MIT

export const INLINE_CITATION_PATTERN = /\[\[(\d+)\]\]/g;

export interface InlineCitationToken {
  type: "text" | "citation";
  value: string;
  sourceIndex?: number;
}

export function tokenizeInlineCitations(text: string): InlineCitationToken[] {
  const tokens: InlineCitationToken[] = [];
  let cursor = 0;

  for (const match of text.matchAll(INLINE_CITATION_PATTERN)) {
    const index = match.index ?? 0;

    if (index > cursor) {
      tokens.push({ type: "text", value: text.slice(cursor, index) });
    }

    tokens.push({
      type: "citation",
      value: match[0],
      sourceIndex: Number(match[1]) - 1,
    });

    cursor = index + match[0].length;
  }

  if (cursor < text.length) {
    tokens.push({ type: "text", value: text.slice(cursor) });
  }

  return tokens;
}
