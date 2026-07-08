# OpenSIN-Chat — User Documentation

## Getting Started

### Prerequisites

- **Node.js** >= 22.0.0
- **Yarn** (for server) or **npm** (for frontend)
- **Python 3** (for some native dependencies)

### Quick Start (Development)

```bash
# 1. Clone the repository
git clone https://github.com/OpenSIN-AI/OpenSIN-Chat.git
cd OpenSIN-Chat

# 2. Install server dependencies
cd server
cp .env.example .env
yarn install
yarn dev

# 3. In a new terminal, install frontend dependencies
cd frontend
npm install
npm run dev

# 4. Open http://localhost:3000 in your browser
```

### Production Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions on:
- Docker deployment
- Bare metal deployment
- Cloud deployment (Vercel + Railway, etc.)

## Features

### Chat
- **Workspace-based chat**: Organize conversations into workspaces
- **Thread support**: Create multiple threads within a workspace
- **Streaming responses**: Real-time SSE streaming for instant feedback
- **Multi-model support**: OpenAI, Anthropic, Ollama, and local models
- **Agent mode**: Use `@agent` prefix to enable tool access (web search, file operations, etc.)

### Document Management
- **Upload & embed**: PDF, TXT, DOCX, MD files
- **Vector search**: Semantic search across your documents
- **PDF Analysis Pipeline**: Autonomous multi-agent analysis with FTS5 fact extraction
- **Document sync**: Watch and auto-sync external documents

### Workspaces
- **Multi-user mode**: Role-based access (admin, manager, user)
- **Workspace settings**: Configure LLM provider, embedding engine, vector DB per workspace
- **Thread folders**: Organize threads into folders
- **Parsed files**: Upload files for context without full embedding

### Agent Framework
- **MCP integration**: Model Context Protocol for external tool access
- **Agent skills**: Extensible skill system (Gmail, Google Calendar, filesystem, etc.)
- **Subagent spawning**: Isolated run contexts with parent-child lineage
- **Trigger engine**: Schedule agent runs with cron expressions

### Text-to-Speech (TTS)
- **7 TTS Engines**: Native (browser), OpenAI-compatible, ElevenLabs, Kokoro, Piper (local), NVIDIA NIM, **cvoice.ai** (German celebrity voices)
- **cvoice.ai**: 20,000+ voices incl. Gronkh, Dieter Bohlen, Joko, Julien Bam, Bushido, Daniela Katzenberger
- **Server-side API key**: Frontend sees only a boolean — key never exposed to client
- **LRU cache**: 256-entry in-memory cache mitigates rate limits (10 req/min, 1,000 req/day free tier)
- **Config**: `TTS_PROVIDER="cvoice"` + `TTS_CVOICE_API_KEY` in `server/.env`

## Configuration

### Environment Variables

Key environment variables (see `server/.env.example` for the full list):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment |
| `VECTOR_DB` | `lancedb` | Vector database provider |
| `LLM_PROVIDER` | `openai` | LLM provider |
| `EMBEDDING_ENGINE` | `inherit` | Embedding engine |
| `DISABLE_RATE_LIMITS` | `false` | Disable API rate limiting |

### Smoke Test

After deployment, verify the server is healthy:

```bash
# From the repository root
node scripts/smoke.mjs http://localhost:3001

# Or from the server directory
cd server && yarn smoke
```

This checks `/api/ping`, `/api/setup-complete`, and `/api/system/env-dump`.

## Testing

### Server Tests (Jest)

```bash
cd server
yarn test              # Run all tests
yarn test:coverage     # Run with coverage report
yarn test:watch        # Watch mode
```

### Frontend Tests (Vitest)

```bash
cd frontend
npm run test           # Run all tests
npm run test:coverage  # Run with coverage report
npm run test:watch     # Watch mode
```

### E2E Tests (Playwright)

```bash
cd frontend
npm run e2e            # Run Playwright e2e tests
```

### Smoke Tests

```bash
# API smoke test
node scripts/smoke.mjs

# E2E smoke test
cd frontend && npx playwright test tests/e2e/smoke.spec.js
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed architecture diagram and data flow description.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines, code style, and PR process.

## License

MIT — See [LICENSE](./LICENSE)
