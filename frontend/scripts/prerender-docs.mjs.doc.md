# frontend/scripts/prerender-docs.mjs

## What it does

Build-time static prerender for the `/docs` pages. After the Vite frontend build
completes, this script reads the curated markdown files in
`src/pages/Docs/content/`, renders them with the same `markdown-it` +
`highlight.js` + `DOMPurify` pipeline used by the React app, and writes one
HTML file per doc to `frontend/dist/docs/<slug>.html`.

The server can then inject this markup into the `<div id="root">` of the page
for `/docs/*` requests, so the first paint no longer depends on downloading,
parsing, and executing the full React bundle.

## When it runs

Invoked from `frontend/scripts/postbuild.js` after the Vite build and the
`index.html` → `_index.html` rename. It only runs during `yarn build` in the
frontend workspace.

## Dependencies

- `jsdom` — provides the DOM that `DOMPurify` needs to sanitize HTML.
- `markdown-it` — markdown parsing (mirrors the in-app renderer).
- `highlight.js` — syntax highlighting for fenced code blocks.
- `dompurify` — sanitization of rendered HTML.
- Hardcoded copy of the docs manifest from `src/pages/Docs/docsManifest.ts` so
  the script can run without Vite's `import.meta.glob`.

## Output

`frontend/dist/docs/<slug>.html` for every curated doc entry. The deployment
pipeline copies `frontend/dist` into `server/public/`, so the server reads the
prerendered fragments from `server/public/docs/<slug>.html`.

## Important behavior

- Missing content files are skipped with a warning; the build still succeeds.
- The generated markup intentionally mirrors the React `Docs` component so the
  client-side app can hydrate it.
- `/docs` without a slug defaults to `user-guide.html`.
