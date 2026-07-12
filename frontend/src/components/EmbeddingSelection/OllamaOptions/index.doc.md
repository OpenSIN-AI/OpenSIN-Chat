# Ollama Embedding Options

## Purpose

Renders Ollama embedding settings for model selection, endpoint auto-discovery, batch sizing, chunk sizing, and optional auth-token entry.

## Notes

- Stored auth tokens render as a controlled masked placeholder.
- Mask placeholders are ignored by endpoint auto-discovery so probing does not authenticate with fake secrets.
