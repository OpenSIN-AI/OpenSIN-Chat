# THIRD-PARTY NOTICES & ACKNOWLEDGMENTS

> **OpenSIN Chat** is a sovereign, independent AI platform for political research.
> It builds on architectural concepts and engineering practices from prior open-source work,
> including [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) by [Mintplex Labs Inc.](https://github.com/Mintplex-Labs).
> We gratefully acknowledge **Timothy Carambat** and the Mintplex team for establishing foundational patterns
> and maintaining high standards of open-source engineering.

## Third-Party NPM Packages

The following packages are used by OpenSIN Chat:

| Package | Purpose | License |
|---------|---------|---------|
| `@mintplex-labs/express-ws` | WebSocket utility for Express | MIT |
| `@mintplex-labs/bree` | Background job scheduling | MIT |
| `@mintplex-labs/piper-tts-web` | Local text-to-speech (Piper) | MIT |

These packages are actively maintained by the Mintplex team and we retain their original names to ensure compatibility and proper attribution.

## Embedded Models

- **Default Embedder:** `Xenova/all-MiniLM-L6-v2` (Apache 2.0)
- **Speech Recognition:** OpenAI Whisper (MIT)

Models are loaded locally within the container; no external requests are made without explicit user configuration.

## External LLM, Embedding & Vector DB Providers

These are optional. When configured in `.env`, data will be transmitted to their services.
Review their terms of service directly:

- OpenAI, Anthropic, Google Gemini, Mistral, Cohere, Groq, xAI, DeepSeek,
  Perplexity, OpenRouter, Together AI, Fireworks AI, Novita, Moonshot AI,
  PPIO, Gitee AI, Apipie, Z.AI, SambaNova, Cerebras, Lemonade, PrivateModeAI,
  Docker Model Runner, Microsoft Foundry Local, CometAPI, Minimax
- Pinecone, Chroma, ChromaCloud, Weaviate, Qdrant, Milvus, Zilliz, Astra DB,
  PGVector, LanceDB

## Browser-Stack

- React 19, Vite, TailwindCSS, Phosphor Icons — alle MIT/Apache.

## Such- und API-Provider (für Agenten)

- Google Programmable Search, SearchApi.io, SerpApi, Serper.dev,
  Bing Search, Baidu Search, Serply.io, SearXNG, Tavily, Exa, Perplexity
  Search.

---

Diese Liste ist nicht abschließend. Für eine vollständige Auflistung siehe
die `package.json`-Dateien in `frontend/`, `server/` und `collector/`.
