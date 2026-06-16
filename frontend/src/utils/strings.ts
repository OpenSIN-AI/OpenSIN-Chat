// SPDX-License-Identifier: MIT
// Docs: strings.doc.md
// Purpose: Lightweight inline replacement for the deprecated `truncate` package (3.0.0).
// truncate("hello world", 8) === "hello w…"
// truncate("hi", 8)          === "hi"
export const truncate = (text = "", length = 30) =>
  text.length > length ? `${text.slice(0, length - 1)}…` : text;
