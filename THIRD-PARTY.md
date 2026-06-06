# THIRD-PARTY NOTICES

OpenAfD Chat baut auf Open-Source-Komponenten auf. Wir sind allen Mitwirkenden
zu großem Dank verpflichtet. Die wichtigsten Bestandteile:

## Upstream

- **[AnythingLLM](https://github.com/Mintplex-Labs/anything-llm)** by
  [Mintplex Labs Inc.](https://github.com/Mintplex-Labs) — MIT-Lizenz.
  OpenAfD Chat ist ein direkter Fork dieses Projekts. Wir danken Timothy
  Carambat und dem gesamten Mintplex-Team für die exzellente Arbeit, ohne
  die dieses Projekt nicht möglich wäre.

- **Upstream-Sync:** Wir empfehlen, das Upstream-Repo als Git-Remote
  hinzuzufügen, um Sicherheits-Patches mitzuziehen:
  ```bash
  git remote add upstream https://github.com/Mintplex-Labs/anything-llm.git
  git fetch upstream
  ```

## NPM-Pakete (Auswahl)

Die folgenden NPM-Pakete aus dem Mintplex-Labs-Ökosystem werden weiterhin
direkt genutzt, da sie exzellente spezialisierte Funktionen bieten:

| Paket | Zweck | Lizenz |
|-------|-------|--------|
| `@mintplex-labs/express-ws` | WebSocket-Hilfsbibliothek für Express | MIT |
| `@mintplex-labs/bree` | Job-Scheduling für Hintergrund-Tasks | MIT |
| `@mintplex-labs/piper-tts-web` | Lokale TTS-Engine (Piper) im Browser | MIT |

Diese Pakete sind im `package.json` weiterhin unter ihrem Originalnamen
referenziert. Das ist absichtlich — sie werden aktiv vom Mintplex-Team
gewartet und wir wollen keine künstliche Namensänderung.

## Eingebettete Modelle

- **Default-Embedder:** `Xenova/all-MiniLM-L6-v2` (Apache 2.0)
- **Whisper (Built-in):** OpenAI Whisper (MIT)

Diese werden lokal im Container geladen; es werden keine Anfragen an
externe Dienste gestellt.

## LLM-, Embedding- und Vektor-DB-Provider (externe, optional)

Wenn du diese Provider in deiner `.env` aktivierst, werden Daten an die
entsprechenden Dienste übertragen. Prüfe deren Nutzungsbedingungen
selbst:

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
