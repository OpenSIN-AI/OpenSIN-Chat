# Frontend Entry Point

## Purpose

Bootstraps the React application, installs the auth interceptor, starts dev-only mock workers when explicitly enabled, and mounts the router.

## Notes

- Dev mock startup runs inside `bootstrap()` so the production build does not require top-level `await` support.
- Keep `regenerator-runtime/runtime` as the first import; speech-recognition vendor code depends on it during module evaluation.
