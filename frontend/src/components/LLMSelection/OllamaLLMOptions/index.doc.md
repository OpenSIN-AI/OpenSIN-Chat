# Ollama LLM Options

## Purpose

Renders Ollama chat model settings for model selection, endpoint auto-discovery, context limits, token limits, and optional auth-token entry.

## Notes

- Stored auth tokens render as a controlled masked placeholder.
- Mask placeholders are ignored by endpoint auto-discovery so probing does not authenticate with fake secrets.
