# OpenSIN-Chat — Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           OpenSIN-Chat Architecture                      │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌──────────┐
                              │  Browser │
                              │ (Client) │
                              └────┬─────┘
                                   │
                          ┌────────▼────────┐
                          │   Vite Dev Server │
                          │   (frontend:3000) │
                          └────────┬────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │      Express.js Server       │
                    │     (server:3001, Node 22)   │
                    │                              │
                    │  ┌─────────┐  ┌───────────┐  │
                    │  │ REST API│  │ WebSocket  │  │
                    │  │ /api/*  │  │  /ws/*     │  │
                    │  └────┬────┘  └─────┬─────┘  │
                    │       │             │        │
                    │  ┌────▼─────────────▼─────┐  │
                    │  │   Endpoint Layer        │  │
                    │  │  (endpoints/*.js)       │  │
                    │  └────────────┬───────────┘  │
                    │               │              │
                    │  ┌────────────▼───────────┐  │
                    │  │   Model Layer           │  │
                    │  │  (models/*.js)          │  │
                    │  └────────────┬───────────┘  │
                    │               │              │
                    │  ┌────────────▼───────────┐  │
                    │  │   Prisma ORM            │  │
                    │  │  (@prisma/client)       │  │
                    │  └────────────┬───────────┘  │
                    └───────────────┼──────────────┘
                                    │
                    ┌───────────────▼──────────────┐
                    │       Database (SQLite)       │
                    │   (better-sqlite3 / PG)       │
                    └───────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │                        Key Subsystems                                │
  ├─────────────────────────────────────────────────────────────────────┤
  │                                                                     │
  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐    │
  │  │ LLM Provider│  │ Vector DB    │  │ Embedding Engine          │    │
  │  │ (OpenAI,    │  │ (LanceDB,    │  │ (Native, OpenAI,          │    │
  │  │  Anthropic, │  │  PGVector,   │  │  HuggingFace,             │    │
  │  │  Ollama)    │  │  Chroma)     │  │  Cohere)                  │    │
  │  └─────────────┘  └──────────────┘  └──────────────────────────┘    │
  │                                                                     │
  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐    │
  │  │ Background  │  │ PDF Analysis │  │ Agent Framework          │    │
  │  │ Workers     │  │ Pipeline     │  │ (AIbitat, MCP,           │    │
  │  │ (Bree)      │  │ (FTS5, OCR)  │  │  Tools, Skills)          │    │
  │  └─────────────┘  └──────────────┘  └──────────────────────────┘    │
  │                                                                     │
  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐    │
  │  │ TTS/STT     │  │ Web Push     │  │ Document Sync            │    │
  │  │ (Native,    │  │ Notifications│  │ Queue (Bree jobs)        │    │
  │  │  ElevenLabs)│  │              │  │                          │    │
  │  └─────────────┘  └──────────────┘  └──────────────────────────┘    │
  │                                                                     │
  └─────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │                      Data Flow: Chat Request                         │
  ├─────────────────────────────────────────────────────────────────────┤
  │                                                                     │
  │  User Input → Frontend (React)                                      │
  │      │                                                              │
  │      ├─ WebSocket (if connected) → Server WS handler                │
  │      │                                                              │
  │      └─ SSE Stream → /api/workspace/:slug/chat                      │
  │          │                                                          │
  │          ├─ streamChatHandler → streamChatWithWorkspace             │
  │          │   │                                                      │
  │          │   ├─ Vector Search (similarity threshold, top-N)         │
  │          │   ├─ Context Assembly (system prompt + history + docs)   │
  │          │   ├─ LLM Call (streaming via SSE)                        │
  │          │   └─ Response → WorkspaceChats.new (persist)             │
  │          │                                                          │
  │          └─ SSE Heartbeat (15s keepalive)                           │
  │                                                                     │
  └─────────────────────────────────────────────────────────────────────┘
```
