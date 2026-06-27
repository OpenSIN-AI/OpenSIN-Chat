# Third-Party Components

OpenSIN Chat is a sovereign, independent AI platform (MIT-licensed). It builds on
architectural foundations from earlier open-source work, which we gratefully acknowledge below.

> It builds on architectural concepts and engineering practices from prior open-source work,
> including [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) by [Mintplex Labs Inc.](https://github.com/Mintplex-Labs).
> We gratefully acknowledge **Timothy Carambat** and the Mintplex team for establishing foundational patterns
> and maintaining high standards of open-source engineering.

## Foundational acknowledgments

| Project | License | Usage |
|---------|---------|-------|
| [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) | MIT | Architectural foundation that inspired the full-stack structure (frontend, server, collector, vector-DB layer) |
| [Mintplex Labs](https://github.com/Mintplex-Labs) | MIT | Authors of the foundational open-source work |

## Third-Party NPM Packages

The following packages are used by OpenSIN Chat:

| Package | Purpose | License |
|---------|---------|---------|
| `@mintplex-labs/express-ws` | WebSocket utility for Express | MIT |
| `@mintplex-labs/bree` | Background job scheduling | MIT |
| `@mintplex-labs/piper-tts-web` | Local text-to-speech (Piper) | MIT |

These packages are actively maintained by the Mintplex team and we retain their original names to ensure compatibility and proper attribution.

## Key dependencies

| Project | License | Usage |
|---------|---------|-------|
| [React](https://github.com/facebook/react) | MIT | Frontend UI |
| [Vite](https://github.com/vitejs/vite) | MIT | Frontend build tooling |
| [Vitest](https://github.com/vitest-dev/vitest) | MIT | Frontend test runner |
| [Express](https://github.com/expressjs/express) | MIT | Server API framework |
| [Jest](https://github.com/jestjs/jest) | MIT | Server test runner |
| [Prisma](https://github.com/prisma/prisma) | Apache-2.0 | Database ORM |
| [SWR](https://github.com/vercel/swr) | MIT | React data fetching |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | MIT | Utility-first CSS |
| [pdfjs-dist](https://github.com/mozilla/pdf.js) | Apache-2.0 | PDF text extraction |
| [PDFKit](https://github.com/foliojs/pdfkit) | MIT | PDF report generation |

## Embedded Models

- **Default Embedder:** `Xenova/all-MiniLM-L6-v2` (Apache 2.0)
- **Speech Recognition:** OpenAI Whisper (MIT)

Models are loaded locally within the container; no external requests are made without explicit user configuration.

## External data sources

| Source | Usage |
|--------|-------|
| [Bundestag Open Data API](https://www.bundestag.de/services/opendata) | Politician data, speeches, votes |
| [Abgeordnetenwatch API](https://www.abgeordnetenwatch.de/) | Constituency, committees, side jobs |
| [SerpAPI](https://serpapi.com/) / DuckDuckGo | Web search in research pipeline |

## Provider integrations

The project supports LLM, embedding, and vector-DB providers via their respective official SDKs and APIs. See `docs/api.md` and `docs/DATA-SOURCES.md` for details.

These are optional. When configured in `.env`, data will be transmitted to their services.
Review their terms of service directly:

- OpenAI, Anthropic, Google Gemini, Mistral, Cohere, Groq, xAI, DeepSeek,
  Perplexity, OpenRouter, Together AI, Fireworks AI, Novita, Moonshot AI,
  PPIO, Gitee AI, Apipie, Z.AI, SambaNova, Cerebras, Lemonade, PrivateModeAI,
  Docker Model Runner, Microsoft Foundry Local, CometAPI, Minimax
- Pinecone, Chroma, ChromaCloud, Weaviate, Qdrant, Milvus, Zilliz, Astra DB,
  PGVector, LanceDB

## Browser-Stack

- React 19, Vite, TailwindCSS, Phosphor Icons — all MIT/Apache.

## Search & API Providers (for Agents)

- Google Programmable Search, SearchApi.io, SerpApi, Serper.dev,
  Bing Search, Baidu Search, Serply.io, SearXNG, Tavily, Exa, Perplexity
  Search.

---

This list is not exhaustive. For a full dependency list, see the individual `package.json` files in `frontend/`, `server/`, and `collector/`.
