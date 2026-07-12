# Vite Config

## Purpose

Configures the OpenSIN frontend build, dev-server proxy, dependency pre-bundling, vendor chunking, and bundle visualization.

## Notes

- Vite 8 uses Rolldown for dependency optimization; avoid deprecated `optimizeDeps.esbuildOptions`.
- Keep browser polyfill aliases limited to dependencies that actually require Node-style globals.
