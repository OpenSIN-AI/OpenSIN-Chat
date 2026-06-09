# Project Rules

- [2026-06-09T05:24:26.454Z] Never use  to silently swallow promise rejections. Always use  so errors are visible in logs. (priority: -1)

- [2026-06-09T05:44:40.203Z] For all OpenAI-compatible local/self-hosted providers, NEVER use  in the OpenAI SDK constructor. The SDK throws "Missing credentials" on null/empty apiKey. Always use  with a placeholder string. This applies to all provider/index.js files and any agent provider files that create OpenAI clients. (priority: -1)
