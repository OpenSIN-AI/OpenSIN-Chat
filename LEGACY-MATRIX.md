# OpenSIN-Chat Legacy-Matrix

> Systematische Bestandsaufnahme aller AnythingLLM-Erbe-Komponenten.
> Letzte Aktualisierung: 2026-07-23

## Entscheidungsmodell

| Code | Bedeutung |
|---|---|
| KEEP | Gehört zum OpenSIN-Produktkern, bleibt wie ist |
| WRAP | Vorübergehend hinter OpenSIN-Schnittstelle kapseln |
| REPLACE | Durch kleinere OpenSIN-eigene Implementierung ersetzen |
| REMOVE | Vollständig entfernen |
| QUARANTINE | Deaktivieren, als Legacy markieren, später entfernen |

---

## 1. LLM Provider (server/utils/AiProviders/)

| Provider | Nutzung | Entscheidung | Ersatz/Migration | Status |
|---|---|---|---|---|
| fireworksAi | **PRIMÄR** — aktiv in Produktion (SINator Pool) | KEEP | — | — |
| anthropic | Aktiv konfigurierbar, produktionsrelevant | KEEP | — | — |
| ollama | Aktiv konfigurierbar, lokal relevant | KEEP | — | — |
| genericOpenAi | Aktiv als Fallback/OpenAI-kompatibel | KEEP | — | — |
| openAi | Legacy, wird durch genericOpenAi abgedeckt | REPLACE | genericOpenAi übernimmt | PENDING |
| gemini | Nicht in aktiver Nutzung | QUARANTINE | — | PENDING |
| groq | Nicht in aktiver Nutzung | REMOVE | — | PENDING |
| huggingface | Nicht in aktiver Nutzung | REMOVE | — | PENDING |
| liteLLM | Nicht in aktiver Nutzung | REMOVE | — | PENDING |
| lmStudio | Lokal, ähnlich ollama | QUARANTINE | — | PENDING |
| localAi | Nicht in aktiver Nutzung | REMOVE | — | PENDING |
| mistral | Nicht in aktiver Nutzung | REMOVE | — | PENDING |
| nvidiaNim | Früher genutzt, jetzt Fireworks | REMOVE | — | PENDING |
| xai | Nicht in aktiver Nutzung | QUARANTINE | — | PENDING |
| opencodeZen | OpenSIN-eigen | KEEP | — | — |
| dockerModelRunner | Neu, lokal relevant | QUARANTINE | — | PENDING |
| modelRouter | OpenSIN-eigen | KEEP | — | — |
| modelMap | OpenSIN-eigen | KEEP | — | — |

## 2. Embedding Engines (server/utils/EmbeddingEngines/)

| Engine | Nutzung | Entscheidung | Status |
|---|---|---|---|
| native | OpenSIN-eigen (Transformers.js) | KEEP | — |
| ollama | Lokal relevant | KEEP | — |
| genericOpenAi | OpenAI-kompatibel | KEEP | — |
| openAi | Legacy, durch genericOpenAi abgedeckt | REPLACE | PENDING |
| gemini | Nicht aktiv | QUARANTINE | PENDING |
| liteLLM | Nicht aktiv | REMOVE | PENDING |
| lmstudio | Lokal, ähnlich ollama | QUARANTINE | PENDING |
| localAi | Nicht aktiv | REMOVE | PENDING |
| mistral | Nicht aktiv | REMOVE | PENDING |
| voyageAi | Nicht aktiv | REMOVE | PENDING |
| azureOpenAi | Nicht aktiv, Legacy | REMOVE | PENDING |

## 3. Vector DB Providers (server/utils/vectorDbProviders/)

| Provider | Nutzung | Entscheidung | Status |
|---|---|---|---|
| lance (LanceDB) | **PRIMÄR** — aktiv lokal | KEEP | — |
| pgvector | Aktiv für PostgreSQL-Profile | KEEP | — |

## 4. Text-to-Speech (server/utils/TextToSpeech/)

| Engine | Nutzung | Entscheidung | Status |
|---|---|---|---|
| kokoro | OpenSIN-eigen, lokal | KEEP | — |
| native | Browser-native TTS | KEEP | — |
| openAi | API-basiert | KEEP | — |
| openAiGeneric | OpenAI-kompatibel | KEEP | — |
| nvidiaNim | Früher genutzt | REMOVE | PENDING |
| cvoice | Nicht aktiv | REMOVE | PENDING |

## 5. Speech-to-Text (server/utils/SpeechToText/)

| Engine | Nutzung | Entscheidung | Status |
|---|---|---|---|
| openAi | API-basiert | KEEP | — |
| openAiGeneric | OpenAI-kompatibel | KEEP | — |
| deepgram | Nicht aktiv | QUARANTINE | PENDING |

## 6. Embedding Rerankers (server/utils/EmbeddingRerankers/)

| Engine | Nutzung | Entscheidung | Status |
|---|---|---|---|
| native | OpenSIN-eigen | KEEP | — |

## 7. @mintplex-labs Abhängigkeiten

| Paket | Nutzung | Entscheidung | Ersatz | Status |
|---|---|---|---|---|
| @mintplex-labs/bree | Background-Job-Scheduler | REPLACE | node-cron oder eigener Scheduler | PENDING |
| @mintplex-labs/express-ws | WebSocket-Support | REPLACE | ws + express wrapper | PENDING |
| @mintplex-labs/mdpdf | Markdown→PDF | REPLACE | puppeteer oder pdfkit | PENDING |
| @mintplex-labs/piper-tts-web | Piper TTS im Browser | WRAP | Beibehalten bis Piper-Alternative | PENDING |

## 8. Docker/Deployment

| Komponente | Nutzung | Entscheidung | Status |
|---|---|---|---|
| docker/ (Haupt-Dockerfile + compose) | **PRIMÄR** — aktiv | KEEP | — |
| docker-opensin/ (Hardened profile) | Aktiv für Produktion | KEEP | — |
| cloud-deployments/ (AWS/GCP/Azure/DO/Helm/OpenShift) | **NICHT aktiv** | REMOVE | PENDING |

## 9. Frontend Provider-UI (frontend/src/components/LLMSelection/)

| Komponente | Entsprechung Backend | Entscheidung | Status |
|---|---|---|---|
| FireworksAiOptions | fireworksAi | KEEP | — |
| AnthropicAiOptions | anthropic | KEEP | — |
| OllamaLLMOptions | ollama | KEEP | — |
| GenericOpenAiOptions | genericOpenAi | KEEP | — |
| OpenAiOptions | openAi (legacy) | REMOVE | PENDING |
| GeminiLLMOptions | gemini | QUARANTINE | PENDING |
| HuggingFaceOptions | huggingface | REMOVE | PENDING |
| LMStudioOptions | lmStudio | QUARANTINE | PENDING |
| NvidiaNimOptions | nvidiaNim | REMOVE | PENDING |
| XAiLLMOptions | xai | QUARANTINE | PENDING |
| OpencodeZenOptions | opencodeZen | KEEP | — |
| ModelRouterOptions | modelRouter | KEEP | — |

## 10. Collector

| Komponente | Nutzung | Entscheidung | Status |
|---|---|---|---|
| Document parsing (PDF, DOCX, etc.) | Aktiv | KEEP | — |
| OCR (Tesseract) | Optional aktiv | KEEP | — |
| Browser automation (Puppeteer) | Optional aktiv | KEEP | — |
| WhisperProviders | Optional | KEEP | — |
| safeUnzip | Aktiv | KEEP | — |
| anythingllm.com Downloads | **NICHT aktiv** | REMOVE | PENDING |

## 11. Repository-Hygiene

| Komponente | Nutzung | Entscheidung | Status |
|---|---|---|---|
| 27 .doc.md Dateien | CoDocs-Standard | KEEP (aktualisieren) | — |
| 525 Test-Dateien | Aktiv | KEEP | — |
| cloud-deployments/ | Nicht aktiv | REMOVE | PENDING |
| docker/docker-compose.supabase.yml | Nicht aktiv | QUARANTINE | PENDING |
| docker/supabase-init/ | Nicht aktiv | QUARANTINE | PENDING |
| docker/vex/ | Nicht aktiv | REMOVE | PENDING |
| docker/nginx/ | Nicht aktiv | REMOVE | PENDING |
| Fake GitHub Clone (NewProjectModal) | Bereits entfernt | DONE | — |

## 12. Daten/Schema

| Aspekt | Status | Entscheidung |
|---|---|---|
| SQLite als primäre DB | Aktiv | KEEP |
| PostgreSQL/pgvector | Aktiv für Prod-Profile | KEEP |
| Prisma Migration Drift | Bekannt (db push statt migrate) | WRAP |
| workspace_artifacts | Neu hinzugefügt | KEEP |
| agent_runs.turn_id | Neu hinzugefügt | KEEP |

---

## Wellen-Plan

### Welle 1 (P0 Repository): cloud-deployments/, docker/vex/, docker/nginx/, ungenutzte docker-compose files
### Welle 2 (P0 Provider): huggingface, groq, litellm, localai, mistral, nvidiaNim, voyageAi, azureOpenAi aus Backend entfernen
### Welle 3 (P0 Provider-UI): Entsprechende Frontend-Komponenten entfernen
### Welle 4 (P0 @mintplex-labs): bree → node-cron, express-ws → ws evaluieren
### Welle 5 (P1 Collector): anythingllm.com Downloads entfernen, Contracts definieren
### Welle 6 (P1 Frontend): doppelte Libs, Polyfills, Provider-Options aufräumen
### Welle 7 (P1 Daten): Schema bereinigen, Migrationen prüfen
