// SPDX-License-Identifier: MIT
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
    // eslint-disable-next-line no-console
    console.log(`\x1b[36m[${this.name}]\x1b[0m ${text}`, ...args);
  }

  #defaultMeta() {
    return [
      {
        tag: "link",
        props: { type: "image/svg+xml", href: "/favicon.png" },
        content: null,
      },
      {
        tag: "title",
        props: null,
        content: "OpenSIN Chat — Sovereigner KI-Arbeitsraum",
      },

      {
        tag: "meta",
        props: {
          name: "title",
          content: "OpenSIN Chat — Sovereigner KI-Arbeitsraum",
        },
      },
      {
        tag: "meta",
        props: {
          name: "description",
          content:
            "Sovereäner KI-Arbeitsraum für patriotische Politik. Chatte mit deinen Dokumenten, automatisiere Recherche, selbst gehostet, ohne Telemetrie.",
        },
      },

      // <!-- Facebook -->
      { tag: "meta", props: { property: "og:type", content: "website" } },
      {
        tag: "meta",
        props: { property: "og:url", content: "https://opensin.delqhi.com" },
      },
      {
        tag: "meta",
        props: {
          property: "og:title",
          content: "OpenSIN Chat — Sovereigner KI-Arbeitsraum",
        },
      },
      {
        tag: "meta",
        props: {
          property: "og:description",
          content:
            "Sovereäner KI-Arbeitsraum für patriotische Politik. Selbst gehostet, DSGVO-konform, ohne Telemetrie.",
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
          content: "https://opensin.delqhi.com",
        },
      },
      {
        tag: "meta",
        props: {
          property: "twitter:title",
          content: "OpenSIN Chat — Sovereigner KI-Arbeitsraum",
        },
      },
      {
        tag: "meta",
        props: {
          property: "twitter:description",
          content:
            "Sovereäner KI-Arbeitsraum für patriotische Politik. Selbst gehostet, DSGVO-konform, ohne Telemetrie.",
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
    ];
  }

  /**
   * Assembles Meta tags as one large string
   * @param {MetaTagDefinition[]} tagArray
   * @returns {string}
   */
  #assembleMeta() {
    const output = [];
    for (const tag of (this.#customConfig ?? this.#defaultMeta())) {
      let htmlString;
      htmlString = `<${tag.tag} `;

      if (tag.props !== null) {
        for (const [key, value] of Object.entries(tag.props))
          htmlString += `${key}="${value}" `;
      }

      if (tag.content) {
        htmlString += `>${tag.content}</${tag.tag}>`;
      } else {
        htmlString += `>`;
      }
      output.push(htmlString);
    }
    return output.join("\n");
  }

  #validUrl(faviconUrl = null) {
    if (faviconUrl === null) return "/favicon.png";
    try {
      const url = new URL(faviconUrl);
      return url.toString();
    } catch {
      return "/favicon.png";
    }
  }

  async #fetchConfg() {
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
            content: customTitle ?? "OpenSIN Chat — Sovereigner KI-Arbeitsraum",
          };
        }
        // Override meta title
        if (tag.tag === "meta" && tag.props?.name === "title") {
          return {
            tag: "meta",
            props: {
              name: "title",
              content:
                customTitle ?? "OpenSIN Chat — Sovereigner KI-Arbeitsraum",
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
                customTitle ?? "OpenSIN Chat — Sovereigner KI-Arbeitsraum",
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
                customTitle ?? "OpenSIN Chat — Sovereigner KI-Arbeitsraum",
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
      const indexJsPath = path.resolve(__dirname, "../../public/index.js");
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
  #buildPreloadTags(js) {
    if (!js.length) return "";

    const REACT_RE = /^vendor-react/;
    const ordered = [
      ...js.filter((p) => REACT_RE.test(p)),
      ...js.filter((p) => !REACT_RE.test(p)),
    ];

    return ordered
      .map((p) => `<link rel="modulepreload" crossorigin href="${p}">`)
      .join("\n            ");
  }

  /**
   *
   * @param {import('express').Response} response
   * @param {number} code
   */
  async generate(response, code = 200) {
    if (this.#customConfig === null) await this.#fetchConfg();
    const { js, css } = await this.#readVitePreloadList();
    const preloadTags = this.#buildPreloadTags(js);
    response
      .status(code)
      .setHeader("Cache-Control", "no-cache, no-store, must-revalidate")
      .send(`
       <!DOCTYPE html>
        <html lang="de">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            ${this.#assembleMeta()}
            ${preloadTags}
            <script type="module" crossorigin src="/index.js"></script>
            <link rel="stylesheet" href="/index.css">
            ${css.map((p) => `<link rel="stylesheet" href="${p}">`).join("\n            ")}
          </head>
          <body>
            <div id="root" class="h-screen"></div>
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

      let iconUrl = "/favicon.png";
      if (faviconURL) {
        try {
          new URL(faviconURL);
          iconUrl = faviconURL;
        } catch {
          iconUrl = "/favicon.png";
        }
      }

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
