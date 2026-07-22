// SPDX-License-Identifier: MIT

const MAX_SNIPPET_LENGTH = 220;

function stripMarkup(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_>`~[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSnippet(value, query) {
  const text = stripMarkup(value);
  if (!text) return "";

  const lower = text.toLocaleLowerCase();
  const lowerQuery = String(query).toLocaleLowerCase();

  const matchIndex = lower.indexOf(lowerQuery);

  if (matchIndex < 0) {
    return text.length > MAX_SNIPPET_LENGTH
      ? `${text.slice(0, MAX_SNIPPET_LENGTH - 1)}…`
      : text;
  }

  const contextBefore = 70;
  const start = Math.max(0, matchIndex - contextBefore);
  const end = Math.min(text.length, start + MAX_SNIPPET_LENGTH);

  return [
    start > 0 ? "…" : "",
    text.slice(start, end),
    end < text.length ? "…" : "",
  ].join("");
}

module.exports = {
  MAX_SNIPPET_LENGTH,
  stripMarkup,
  buildSnippet,
};
