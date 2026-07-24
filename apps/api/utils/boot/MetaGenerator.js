// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) => HTML_ESCAPE_MAP[character],
  );
}

/**
 * @typedef MetaTagDefinition
 * @property {('link'|'meta')} tag - the type of meta tag element
 * @property {{string:string}|null} props - the inner key/values of a meta tag
 * @property {string|null} content - Text content to be injected between tags. If null self-closing.
 */

/**
 * OpenSIN Chat — Default-Meta-Tags.
 * Setzt Titel, Beschreibung und OG/Twitter-Karten für die Sovereign-AI-Workbench.
 */
class MetaGenerator {
  name = "MetaGenerator";

  /** @type {MetaGenerator|null} */
  static _instance = null;

  /** @type {MetaTagDefinition[]|null} */
  #customConfig = null;

  #defaultManifest = {
    name: "OpenSIN Chat",
    short_name: "OpenSIN Chat",
    display: "standalone",
    orientation: "portrait",
    start_url: "/",
    icons: [
      {
        src: "/favicon.png",
        sizes: "any",
      },
    ],
  };

  constructor() {
    if (MetaGenerator._instance) return MetaGenerator._instance;
    MetaGenerator._instance = this;
  }

  #log(text, ...args) {
    consoleLogger.log(`\x1b[36m[${this.name}]\x1b[0m ${text}`, ...args);
  }

  #defaultMeta() {
    return [
      {
        tag: "link",
        props: { rel: "icon", type: "image/png", href: "/favicon.png" },
        content: null,
      },
      {
        tag: "title",
        props: null,
        content: "OpenSIN Chat — Souveräner KI-Arbeitsraum",
      },

      {
        tag: "meta",
        props: {
          name: "title",
          content: "OpenSIN Chat — Souveräner KI-Arbeitsraum",
        },
      },
      {
        tag: "meta",
        props: {
          name: "description",
          content:
            "Souveräner KI-Arbeitsraum für patriotische Politik. Chatte mit deinen Dokumenten, automatisiere Recherche, selbst gehostet, ohne Telemetrie.",
        },
      },

      // <!-- Facebook -->
      { tag: "meta", props: { property: "og:type", content: "website" } },
      {
        tag: "meta",
        props: { property: "og:url", content: "https://sinchat.delqhi.com" },
      },
      {
        tag: "meta",
        props: {
          property: "og:title",
          content: "OpenSIN Chat — Souveräner KI-Arbeitsraum",
        },
      },
      {
        tag: "meta",
        props: {
          property: "og:description",
          content:
            "Souveräner KI-Arbeitsraum für patriotische Politik. Selbst gehostet, DSGVO-konform, ohne Telemetrie.",
        },
      },
      {
        tag: "meta",
        props: { property: "og:image", content: "/wordmark.png" },
      },

      // <!-- Twitter -->
      {
        tag: "meta",
        props: { property: "twitter:card", content: "summary_large_image" },
      },
      {
        tag: "meta",
        props: {
          property: "twitter:url",
          content: "https://sinchat.delqhi.com",
        },
      },
      {
        tag: "meta",
        props: {
          property: "twitter:title",
          content: "OpenSIN Chat — Souveräner KI-Arbeitsraum",
        },
      },
      {
        tag: "meta",
        props: {
          property: "twitter:description",
          content:
            "Souveräner KI-Arbeitsraum für patriotische Politik. Selbst gehostet, DSGVO-konform, ohne Telemetrie.",
        },
      },
      {
        tag: "meta",
        props: { property: "twitter:image", content: "/wordmark.png" },
      },

      { tag: "link", props: { rel: "icon", href: "/favicon.png" } },
      { tag: "link", props: { rel: "apple-touch-icon", href: "/favicon.png" } },

      // PWA specific tags
      {
        tag: "meta",
        props: { name: "mobile-web-app-capable", content: "yes" },
      },
      {
        tag: "meta",
        props: { name: "apple-mobile-web-app-capable", content: "yes" },
      },
      {
        tag: "meta",
        props: {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
      },
      { tag: "link", props: { rel: "manifest", href: "/manifest.json" } },

      // Preload brand font to avoid the render-blocking CSS chain.
      {
        tag: "link",
        props: {
          rel: "preload",
          href: "/fonts/PlusJakartaSans.ttf",
          as: "font",
          type: "font/ttf",
          crossorigin: "anonymous",
        },
      },
    ];
  }

  /**
   * Assembles Meta tags as one large string
   * @param {MetaTagDefinition[]} tagArray
   * @returns {string}
   */
  #assembleMeta() {
    const output = [];
    for (const tag of this.#customConfig ?? this.#defaultMeta()) {
      let htmlString = `<${tag.tag}`;

      if (tag.props !== null) {
        for (const [key, value] of Object.entries(tag.props)) {
          if (value === null || value === undefined) continue;
          htmlString += ` ${key}="${escapeHtml(value)}"`;
        }
      }

      htmlString += ">";
      if (tag.content !== null && tag.content !== undefined) {
        htmlString += `${escapeHtml(tag.content)}</${tag.tag}>`;
      }
      output.push(htmlString);
    }
    return output.join("\n");
  }

  #validUrl(faviconUrl = null) {
    const fallback = "/favicon.png";
    if (typeof faviconUrl !== "string") return fallback;

    const value = faviconUrl.trim();
    if (!value) return fallback;
    if (value.startsWith("/") && !value.startsWith("//")) return value;

    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol)
        ? url.toString()
        : fallback;
    } catch {
      return fallback;
    }
  }

  async #fetchConfig() {
    this.#log(`fetching custom meta tag settings...`);
    const { SystemSettings } = require("../../models/systemSettings");
    const customTitle = await SystemSettings.getValueOrFallback(
      { label: "meta_page_title" },
      null,
    );
    const faviconURL = await SystemSettings.getValueOrFallback(
      { label: "meta_page_favicon" },
      null,
    );

    // If nothing defined - assume defaults.
    if (customTitle === null && faviconURL === null) {
      this.#customConfig = this.#defaultMeta();
    } else {
      // When custom settings exist, include all default meta tags but override specific ones
      this.#customConfig = this.#defaultMeta().map((tag) => {
        // Override favicon link
        if (tag.tag === "link" && tag.props?.rel === "icon") {
          return {
            tag: "link",
            props: { rel: "icon", href: this.#validUrl(faviconURL) },
          };
        }
        // Override page title
        if (tag.tag === "title") {
          return {
            tag: "title",
            props: null,
            content: customTitle ?? "OpenSIN Chat — Souveräner KI-Arbeitsraum",
          };
        }
        // Override meta title
        if (tag.tag === "meta" && tag.props?.name === "title") {
          return {
            tag: "meta",
            props: {
              name: "title",
              content:
                customTitle ?? "OpenSIN Chat — Souveräner KI-Arbeitsraum",
            },
          };
        }
        // Override og:title
        if (tag.tag === "meta" && tag.props?.property === "og:title") {
          return {
            tag: "meta",
            props: {
              property: "og:title",
              content:
                customTitle ?? "OpenSIN Chat — Souveräner KI-Arbeitsraum",
            },
          };
        }
        // Override twitter:title
        if (tag.tag === "meta" && tag.props?.property === "twitter:title") {
          return {
            tag: "meta",
            props: {
              property: "twitter:title",
              content:
                customTitle ?? "OpenSIN Chat — Souveräner KI-Arbeitsraum",
            },
          };
        }
        // Override apple-touch-icon if custom favicon is set
        if (
          tag.tag === "link" &&
          tag.props?.rel === "apple-touch-icon" &&
          faviconURL
        ) {
          return {
            tag: "link",
            props: {
              rel: "apple-touch-icon",
              href: this.#validUrl(faviconURL),
            },
          };
        }
        // Return original tag for everything else (including PWA tags)
        return tag;
      });
    }

    return this.#customConfig;
  }

  /**
   * Clears the current config so it can be refetched on the server for next render.
   */
  clearConfig() {
    this.#customConfig = null;
  }

  /**
   * Read /index.js and extract the __vite__mapDeps chunk list so we can
   * emit `<link rel="modulepreload">` tags in the right order. React MUST
   * be preloaded before vendor-ui (TanStack/Floating UI) — otherwise the
   * UI chunk tries to call `useLayoutEffect` before React initializes
   * and the page goes black with a TypeError.
   *
   * @returns {Promise<{js: string[], css: string[]}>}
   */
  async #readVitePreloadList() {
    try {
      const fs = require("fs/promises");
      const path = require("path");
      const publicDir = path.resolve(__dirname, "../../public");
      // Prefer the hashed entry from _index.html (current Vite/Rolldown build).
      // Fall back to legacy public/index.js for older images.
      let indexJsPath = path.join(publicDir, "index.js");
      try {
        const html = await fs.readFile(
          path.join(publicDir, "_index.html"),
          "utf8",
        );
        const entryMatch = html.match(
          /<script[^>]*type="module"[^>]*src="(\/assets\/index-[^"]+\.js)"/,
        );
        if (entryMatch) {
          const candidate = path.join(
            publicDir,
            entryMatch[1].replace(/^\//, ""),
          );
          await fs.access(candidate);
          indexJsPath = candidate;
        }
      } catch {
        // keep index.js fallback
      }
      const content = await fs.readFile(indexJsPath, "utf8");
      // Match: m.f=["assets/...js","assets/...css",...]
      const match = content.match(/m\.f\s*=\s*\[([^\]]+)\]/);
      if (!match) return { js: [], css: [] };
      const raw = match[1];
      // Extract every quoted string
      const items = Array.from(raw.matchAll(/"([^"]+)"/g)).map((m) => m[1]);
      const js = items.filter((p) => p.endsWith(".js")).map((p) => `/${p}`);
      const css = items.filter((p) => p.endsWith(".css")).map((p) => `/${p}`);
      return { js, css };
    } catch (err) {
      this.#log(`could not read vite preload list: ${err.message}`);
      return { js: [], css: [] };
    }
  }

  /**
   * Build the `<link rel="modulepreload" …>` tag list. vendor-react is
   * always emitted first so React is initialized before any UI chunk that
   * depends on it (TanStack Query, Floating UI, etc.) is evaluated.
   *
   * @param {string[]} js
   * @returns {string}
   */
  /**
   * @param {string} path
   * @returns {boolean}
   */
  #isDocsRoute(path) {
    return path === "/docs" || path.startsWith("/docs/");
  }

  /**
   * Reduce the global Vite preload list to only the chunks that matter for the
   * current route. Preloads are hints, not execution order; the module graph
   * still guarantees correct evaluation. This drops the request burst from
   * ~140 modulepreloads to a handful, which is the main driver for the 139 JS
   * requests reported by Lighthouse.
   *
   * @param {string[]} js
   * @param {string} routePath
   * @returns {string[]}
   */
  #filterPreloadList(js, routePath) {
    if (!js.length) return js;

    const basename = (p) =>
      p.replace(/^\/assets\//, "").replace(/-[A-Za-z0-9]+\.(js|css)$/, "");

    // Always keep the runtime + React vendor. (Chunk is named `react-vendor-*`,
    // not `vendor-*` — matching only /vendor-/ missed React entirely.)
    const isCritical = (p) =>
      /\/rolldown-runtime-/.test(p) ||
      /\/react-vendor-/.test(p) ||
      /\/vendor-[A-Za-z0-9_-]+\.js$/.test(p);

    if (!this.#isDocsRoute(routePath)) {
      return js.filter(isCritical);
    }

    // Docs route: also preload the chunks that are needed for the first paint.
    const docsPatterns = [
      "Docs",
      "vendor-markdown",
      "vendor-highlight",
      "markdown",
      "hljs",
      "purify",
      "paths",
      "system",
      "constants",
      "IconBase",
      "BookOpen",
      "ArrowLeft",
      "ArrowRight",
      "List",
      "MagnifyingGlass",
      "TextAlignLeft",
      "X",
      "GithubLogo",
      "CaretRight",
      "Code",
      "Rocket",
      "Stack",
      "Database",
      "CloudArrowUp",
      "ThemeToggle",
      "clipboard",
      "Sun",
    ];

    return js.filter(
      (p) =>
        isCritical(p) ||
        docsPatterns.some((pattern) => basename(p).startsWith(pattern)),
    );
  }

  /**
   * Build the `<link rel="modulepreload" …>` tag list. vendor-react is
   * always emitted first so React is initialized before any UI chunk that
   * depends on it (TanStack Query, Floating UI, etc.) is evaluated.
   *
   * @param {string[]} js
   * @returns {string}
   */
  #buildPreloadTags(js) {
    if (!js.length) return "";

    const REACT_RE = /\/react-vendor-/;
    const ordered = [
      ...js.filter((p) => REACT_RE.test(p)),
      ...js.filter((p) => !REACT_RE.test(p)),
    ];

    return ordered
      .map((p) => `<link rel="modulepreload" crossorigin href="${p}">`)
      .join("\n            ");
  }

  /**
   * Emit stylesheet tags for first paint only.
   *
   * Vite lists every CSS chunk in `_index.html` (pdf-vendor, markdown, Docs,
   * github-dark, …). Emitting all of them as render-blocking stylesheets
   * costs 50–100KB+ of critical CSS on Home/Login. Code-split CSS is injected
   * automatically by Vite when the corresponding JS chunk loads — we only need
   * the main `index-*.css` (and docs/markdown CSS on /docs).
   *
   * CSP note: we cannot use preload+onload (inline handler). Omission is safe.
   *
   * @param {string[]} css
   * @param {string} routePath
   * @returns {string}
   */
  #buildCssTags(css, routePath) {
    if (!css.length) return "";

    const isEntryCss = (p) => /\/assets\/index-[^/]+\.css$/.test(p);
    const isDocsCss = (p) =>
      /\/assets\/(Docs|markdown|github-dark|skeleton)-[^/]+\.css$/.test(p);

    let selected = css.filter(isEntryCss);
    if (this.#isDocsRoute(routePath)) {
      selected = [...selected, ...css.filter(isDocsCss)];
    }
    // De-dupe while preserving order
    selected = [...new Set(selected)];
    if (!selected.length) return "";

    return selected
      .map(
        (p) =>
          // crossorigin must match Vite's runtime stylesheet injection.
          `<link rel="stylesheet" crossorigin href="${p}">`,
      )
      .join("\n            ");
  }

  /**
   * @param {import('express').Request} request
   * @param {import('express').Response} response
   * @param {number} code
   * @param {string|null} prerenderedBody
   */
  /**
   * Read the entry `<script>`/`<link>` asset paths from the built
   * `_index.html` so the server emits the real (hashed) bundle names
   * produced by the production Vite/Rolldown build instead of the
   * dev-only `/index.js` + `/index.css` placeholders.
   *
   * @returns {{entryJs: string, entryCss: string}}
   */
  async #readEntryAssets() {
    const fs = require("fs");
    const path = require("path");
    const fallback = { entryJs: "/index.js", entryCss: "/index.css" };
    try {
      const htmlPath = path.resolve(__dirname, "../../public/_index.html");
      if (!fs.existsSync(htmlPath)) return fallback;
      const html = fs.readFileSync(htmlPath, "utf8");

      const scriptMatch = html.match(
        /<script[^>]*type="module"[^>]*src="([^"]+\.js)"/,
      );
      const entryJs = scriptMatch ? scriptMatch[1] : fallback.entryJs;

      // Entry CSS carries the `index-` hash (vendor CSS is pdf-vendor / markdown / ...).
      const cssMatch = html.match(
        /<link[^>]*rel="stylesheet"[^>]*href="(\/assets\/index-[^"]+\.css)"/,
      );
      const entryCss = cssMatch ? cssMatch[1] : fallback.entryCss;

      return { entryJs, entryCss };
    } catch (err) {
      this.#log(`could not read entry assets from _index.html: ${err.message}`);
      return fallback;
    }
  }

  async generate(request, response, code = 200, prerenderedBody = null) {
    if (this.#customConfig === null) await this.#fetchConfig();
    const routePath = request?.path || "/";
    const { js, css } = await this.#readVitePreloadList();
    const { entryJs, entryCss } = await this.#readEntryAssets();
    const filteredJs = this.#filterPreloadList(js, routePath);
    const preloadTags = this.#buildPreloadTags(filteredJs);
    // Prefer the filtered list; always ensure entry CSS is present even if
    // the Vite preload scan missed it.
    const cssWithEntry =
      entryCss && !css.includes(entryCss) ? [entryCss, ...css] : css;
    const cssTags = this.#buildCssTags(cssWithEntry, routePath);
    const rootContent = prerenderedBody
      ? `<div id="root" class="h-screen">${prerenderedBody}</div>`
      : '<div id="root" class="h-screen"></div>';
    response
      .status(code)
      .setHeader("Cache-Control", "no-cache, no-store, must-revalidate").send(`
       <!DOCTYPE html>
        <html lang="de">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            ${this.#assembleMeta()}
            ${preloadTags}
            <script type="module" crossorigin src="${entryJs}"></script>
            ${cssTags}
          </head>
          <body>
            ${rootContent}
          </body>
        </html>`);
  }

  /**
   * Generates the manifest.json file for the PWA application on the fly.
   * @param {import('express').Response} response
   * @param {number} code
   */
  async generateManifest(response) {
    try {
      const { SystemSettings } = require("../../models/systemSettings");
      const manifestName = await SystemSettings.getValueOrFallback(
        { label: "meta_page_title" },
        "OpenSIN Chat",
      );
      const faviconURL = await SystemSettings.getValueOrFallback(
        { label: "meta_page_favicon" },
        null,
      );

      const iconUrl = this.#validUrl(faviconURL);

      const manifest = {
        name: manifestName,
        short_name: manifestName,
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: iconUrl,
            sizes: "any",
          },
        ],
      };

      response.type("application/json").status(200).send(manifest).end();
    } catch (error) {
      this.#log(`error generating manifest: ${error.message}`, error);
      response
        .type("application/json")
        .status(200)
        .send(this.#defaultManifest)
        .end();
    }
  }
}

module.exports.MetaGenerator = MetaGenerator;
