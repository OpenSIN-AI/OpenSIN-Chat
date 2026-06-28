// SPDX-License-Identifier: MIT
import { encode as HTMLEncode } from "he";
import markdownIt from "markdown-it";
import markdownItKatexPlugin from "./plugins/markdown-katex";
import Appearance from "@/models/appearance";
import hljs from "./hljs";
import "./themes/github-dark.css";
import "./themes/github.css";
import { v4 } from "uuid";
import { resolveDarkMode } from "@/hooks/useTheme";

const markdown = markdownIt({
  html: Appearance.get("renderHTML") ?? false,
  typographer: true,
  highlight: function (code: any, lang: any) {
    const uuid = v4();
    const theme = resolveDarkMode() ? "github-dark" : "github";

    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          `<div class="whitespace-pre-line w-full max-w-[65vw] hljs ${theme} light:border-solid light:border light:border-gray-700 rounded-lg relative font-mono font-normal text-sm text-slate-200">
            <div class="w-full flex items-center sticky top-0 text-slate-200 light:bg-sky-800 bg-stone-800 px-4 py-2 text-xs font-sans justify-between rounded-t-md -mt-5">
              <div class="flex gap-2">
                <code class="text-xs">${lang || ""}</code>
              </div>
              <button data-code-snippet data-code="code-${uuid}" class="flex items-center gap-x-1 hover:text-white transition-colors" title="Code kopieren">
                <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                <p class="text-xs" style="margin:0;padding:0;">Kopieren</p>
              </button>
            </div>
            <pre class="whitespace-pre-wrap px-4 pb-4">` +
          hljs.highlight(code, { language: lang, ignoreIllegals: true }).value +
          "</pre></div>"
        );
      } catch {}
    }

    return (
      `<div class="whitespace-pre-line w-full max-w-[65vw] hljs ${theme} light:border-solid light:border light:border-gray-700 rounded-lg relative font-mono font-normal text-sm text-slate-200">
        <div class="w-full flex items-center sticky top-0 text-slate-200 bg-stone-800 px-4 py-2 text-xs font-sans justify-between rounded-t-md -mt-5">
          <div class="flex gap-2"><code class="text-xs"></code></div>
          <button data-code-snippet data-code="code-${uuid}" class="flex items-center gap-x-1 hover:text-white transition-colors" title="Code kopieren">
            <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
            <p class="text-xs" style="margin:0;padding:0;">Kopieren</p>
          </button>
        </div>
        <pre class="whitespace-pre-wrap px-4 pb-4">` +
      HTMLEncode(code) +
      "</pre></div>"
    );
  },
});

// Add custom renderer for strong tags to handle theme colors
markdown.renderer.rules.strong_open = () => '<strong class="text-white">';
markdown.renderer.rules.strong_close = () => "</strong>";
markdown.renderer.rules.link_open = (tokens, idx) => {
  const token = tokens[idx];
  const href = token.attrs?.find((attr) => attr[0] === "href")?.[1] ?? "#";
  // Block dangerous URI schemes (javascript:, data:, vbscript:) — DOMPurify
  // also strips them, but defence-in-depth prevents them from ever appearing
  // in the HTML string that downstream consumers might cache or log.
  const safeHref = /^(https?:|mailto:|tel:|ftp:|\/|#|\.)/i.test(href)
    ? href
    : "#";
  return `<a href="${HTMLEncode(safeHref)}" target="_blank" rel="noopener noreferrer">`;
};

// Custom renderer for responsive images rendered in markdown
markdown.renderer.rules.image = function (tokens, idx: any) {
  const token = tokens[idx];
  const srcIndex = token.attrIndex("src");
  const src = srcIndex >= 0 ? token.attrs[srcIndex][1] : "";
  const alt = token.content || "";

  // Block dangerous URI schemes in image src — data: SVGs can carry JS.
  const safeSrc =
    src && /^(https?:|data:image\/(?!svg)|\/|\.)/i.test(src) ? src : "";
  if (!safeSrc) return `<div class="w-full max-w-[800px]"></div>`;

  return `<div class="w-full max-w-[800px]" data-markdown-image><img src="${HTMLEncode(safeSrc)}" alt="${HTMLEncode(alt)}" loading="lazy" class="w-full h-auto" /></div>`;
};

// Wrap tables in a scrollable container so wide tables don't overflow
// and get clipped by the border-radius overflow:hidden on .markdown table.
markdown.renderer.rules.table_open = () =>
  '<div class="markdown-table-wrapper"><table>';
markdown.renderer.rules.table_close = () => "</table></div>";

markdown.use(markdownItKatexPlugin);

const RENDER_CACHE = new Map<string, string>();
const RENDER_CACHE_MAX = 256;

function doRender(text: string): string {
  const cleanedText = text.replace(/\n{3,}/g, "\n\n");
  let html = markdown.render(cleanedText);
  // Strip empty KaTeX paragraphs that the katex plugin produces when
  // the text contains lone $ signs (e.g. "$100") — these render as
  // empty <p> tags with empty katex spans, creating large whitespace gaps.
  html = html.replace(
    /<p>\s*<span class="katex-display"><span class="katex">[\s\S]*?<\/span><\/span><\/span><\/p>/g,
    "",
  );
  // Strip truly empty <p> tags (no text content at all)
  html = html.replace(/<p>\s*<\/p>/g, "");
  return html;
}

export default function renderMarkdown(text = "") {
  const cached = RENDER_CACHE.get(text);
  if (cached !== undefined) return cached;
  const html = doRender(text);
  if (RENDER_CACHE.size >= RENDER_CACHE_MAX) {
    const firstKey = RENDER_CACHE.keys().next().value;
    if (firstKey !== undefined) RENDER_CACHE.delete(firstKey);
  }
  RENDER_CACHE.set(text, html);
  return html;
}
