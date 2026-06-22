# server/utils/boot/MetaGenerator.js

## What it does

Generates the HTML shell served by Express for every client-side route. It
reads the Vite chunk map from `public/index.js` and emits:

- Meta tags (title, description, OG/Twitter cards, PWA tags).
- Font preload hint for the brand font.
- Modulepreload hints for the JS chunks needed by the current route.
- Stylesheet tags for the CSS chunks, with non-critical vendor CSS loaded
  asynchronously.

It also supports injecting a pre-rendered HTML body for `/docs/*` routes so the
initial paint can happen before the React bundle boots.

## Key methods

- `generate(request, response, code, prerenderedBody)` — builds the full HTML
  response and sends it. Accepts an optional `prerenderedBody` string that
  replaces the empty `<div id="root">`.
- `generateManifest(response)` — generates `manifest.json` on the fly.
- `clearConfig()` — forces a refetch of system settings on the next render.

## Route-aware optimizations

- For `/docs` and `/docs/:slug`, the preload list is filtered to only the chunks
  that matter for docs (runtime, main vendor, docs route, markdown, highlight,
  icons, etc.), which drops the initial JS request burst from ~140 to ~20.
- For all other routes, only the runtime and main vendor chunks are preloaded.
- Critical CSS (`index.css`, `vendor.css`, and on docs routes `Docs.css` /
  `vendor-highlight.css`) is render-blocking; other vendor CSS is preloaded
  asynchronously.

## Dependencies

- `server/utils/boot/MetaGenerator.js` is imported by `server/app.js`.
- Reads `public/index.js` to extract the Vite chunk map (`m.f=[...]`).
- Reads `public/docs/<slug>.html` when serving a docs route with a prerendered
  body.
