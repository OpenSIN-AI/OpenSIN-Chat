# OpenSIN-Chat Legacy-Matrix

> Systematische Bestandsaufnahme aller AnythingLLM-Erbe-Komponenten.
> Letzte Aktualisierung: 2026-07-23 (nach Welle 5)

## Entscheidungsmodell

| Code | Bedeutung |
|---|---|
| KEEP | Gehört zum OpenSIN-Produktkern, bleibt wie ist |
| WRAP | Vorübergehend hinter OpenSIN-Schnittstelle kapseln |
| REPLACE | Durch kleinere OpenSIN-eigene Implementierung ersetzen |
| REMOVE | Vollständig entfernt |
| QUARANTINE | UI ausgeblendet, Backend bleibt, keine neue Konfiguration |

---

## 1. LLM Provider (server/utils/AiProviders/)

| Provider | Nutzung | Entscheidung | Status |
|---|---|---|---|
| fireworksAi | **PRIMÄR** — aktiv in Produktion | KEEP | DONE |
| anthropic | Aktiv konfigurierbar | KEEP | DONE |
| ollama | Lokal relevant | KEEP | DONE |
| genericOpenAi | OpenAI-kompatibel Fallback | KEEP | DONE |
| openAi | Legacy, durch genericOpenAi abdeckbar | WRAP | DONE |
| gemini | Aktiv konfigurierbar | KEEP | DONE |
| nvidiaNim | NVIDIA RTX GPU, aktiv | KEEP | DONE |
| opencodeZen | OpenSIN-eigen | KEEP | DONE |
| xai | Aktiv konfigurierbar | KEEP | DONE |
| dockerModelRunner | Lokal relevant | KEEP | DONE |
| modelRouter | OpenSIN-eigen | KEEP | DONE |
| modelMap | OpenSIN-eigen | KEEP | DONE |
| ~~groq~~ | Nicht genutzt | ~~REMOVE~~ | DONE (entfernt) |
| ~~huggingface~~ | Nicht genutzt | ~~REMOVE~~ | DONE (entfernt) |
| ~~liteLLM~~ | Nicht genutzt | ~~REMOVE~~ | DONE (entfernt) |
| ~~localAi~~ | Nicht genutzt | ~~REMOVE~~ | DONE (entfernt) |
| ~~mistral~~ | Nicht genutzt | ~~REMOVE~~ | DONE (entfernt) |

## 2. Embedding Engines (server/utils/EmbeddingEngines/)

| Engine | Nutzung | Entscheidung | Status |
|---|---|---|---|
| native | OpenSIN-eigen (Transformers.js) | KEEP | DONE |
| ollama | Lokal relevant | KEEP | DONE |
| genericOpenAi | OpenAI-kompatibel | KEEP | DONE |
| openAi | Legacy, WRAP | WRAP | DONE |
| gemini | Aktiv konfigurierbar | KEEP | DONE |
| ~~lmstudio~~ | UI ausgeblendet | QUARANTINE | DONE (UI entfernt) |
| ~~liteLLM~~ | Nicht genutzt | ~~REMOVE~~ | DONE (entfernt) |
| ~~localAi~~ | Nicht genutzt | ~~REMOVE~~ | DONE (entfernt) |
| ~~mistral~~ | Nicht genutzt | ~~REMOVE~~ | DONE (entfernt) |
| ~~voyageAi~~ | Nicht genutzt | ~~REMOVE~~ | DONE (entfernt) |
| ~~azureOpenAi~~ | Nicht genutzt | ~~REMOVE~~ | DONE (entfernt) |

## 3. Vector DB Providers

| Provider | Entscheidung | Status |
|---|---|---|
| lance (LanceDB) | KEEP | DONE |
| pgvector | KEEP | DONE |

## 4. Text-to-Speech

| Engine | Entscheidung | Status |
|---|---|---|
| kokoro | KEEP | DONE |
| native | KEEP | DONE |
| openAi | KEEP | DONE |
| openAiGeneric | KEEP | DONE |
| nvidiaNim | KEEP | DONE |
| ~~cvoice~~ | ~~REMOVE~~ | DONE (entfernt) |

## 5. Speech-to-Text

| Engine | Entscheidung | Status |
|---|---|---|
| openAi | KEEP | DONE |
| openAiGeneric | KEEP | DONE |
| ~~deepgram~~ | QUARANTINE | DONE (UI entfernt) |

## 6. @mintplex-labs Abhängigkeiten

| Paket | Entscheidung | Status |
|---|---|---|
| @mintplex-labs/bree | WRAP | DONE |
| @mintplex-labs/express-ws | WRAP | DONE |
| @mintplex-labs/mdpdf | WRAP | DONE |
| @mintplex-labs/piper-tts-web | WRAP | DONE |

## 7. Docker/Deployment

| Komponente | Entscheidung | Status |
|---|---|---|
| docker/ (Haupt-Dockerfile) | KEEP | DONE |
| docker-opensin/ (Hardened) | KEEP | DONE |
| ~~cloud-deployments/~~ | ~~REMOVE~~ | DONE (entfernt) |
| ~~docker/vex/~~ | ~~REMOVE~~ | DONE (entfernt) |
| ~~docker/nginx/~~ | ~~REMOVE~~ | DONE (entfernt) |
| ~~docker/supabase*~~ | ~~REMOVE~~ | DONE (entfernt) |

## 8. Collector

| Komponente | Entscheidung | Status |
|---|---|---|
| Document parsing | KEEP | DONE |
| OCR (Tesseract) | KEEP | DONE |
| Browser automation | KEEP | DONE |
| WhisperProviders | KEEP | DONE |
| Contracts dokumentiert | DONE | DONE |
| ~~epub2 (Mintplex fork)~~ | ~~REMOVE~~ | DONE (entfernt) |
| ~~moment~~ | ~~REMOVE~~ | DONE (entfernt) |
| ~~nodemailer~~ | ~~REMOVE~~ | DONE (entfernt) |
| ~~fix-path~~ | ~~REMOVE~~ | DONE (entfernt) |
| ~~strip-ansi~~ | ~~REMOVE~~ | DONE (entfernt) |
| ~~youtube-transcript-plus~~ | ~~REMOVE~~ | DONE (entfernt) |

## 9. Frontend

| Aspekt | Entscheidung | Status |
|---|---|---|
| dayjs | KEEP (aktiv genutzt) | DONE |
| lodash (debounce) | KEEP (aktiv genutzt) | DONE |
| Node-Polyfills (buffer, process, stream, util) | KEEP (Vite benötigt sie) | DONE |
| Provider-UI bereinigt | DONE | DONE |
| LM Studio UI | QUARANTINE | DONE (ausgeblendet) |
| Deepgram UI | QUARANTINE | DONE (ausgeblendet) |

## 10. Repository-Hygiene

| Komponente | Entscheidung | Status |
|---|---|---|
| ~~server/yarn.lock~~ | ~~REMOVE~~ | DONE (entfernt, Root ist kanonisch) |
| ~~20 .sin-code/ Verzeichnisse~~ | ~~REMOVE~~ | DONE (entfernt) |
| ~~.legacy/~~ | ~~REMOVE~~ | DONE (entfernt) |
| LEGACY-MATRIX.md | KEEP | DONE (aktualisiert) |
| Collector CONTRACTS.md | KEEP | DONE |
| Branding-Lint | KEEP | DONE |

## 11. Daten/Schema

| Aspekt | Status |
|---|---|
| SQLite als primäre DB | DONE (KEEP) |
| PostgreSQL/pgvector | DONE (KEEP) |
| Prisma Migration für workspace_artifacts | DONE |
| Prisma Migration für agent_runs.turn_id | DONE |
| Schema validiert | DONE |

---

## Endzustand-Checkliste

- [x] Alle verbleibenden LLM-Provider gehören zum Produkt (fireworks, anthropic, ollama, genericOpenAi, openAi, gemini, nvidiaNim, opencodeZen, xai, dockerModelRunner, modelRouter)
- [x] Keine ungenutzten Provider mehr in der UI (groq, huggingface, litellm, localai, mistral, lmStudio, deepgram ausgeblendet/entfernt)
- [x] Keine AnythingLLM-Laufzeitabhängigkeit mehr aktiv (epub2 Mintplex fork entfernt, @mintplex-labs packages WRAP)
- [x] Keine generierten Dateien im Quellbaum (.sin-code, .legacy entfernt)
- [x] Ein kanonisches yarn.lock (server/yarn.lock entfernt)
- [x] Keine widersprüchlichen Docker-Pfade (cloud-deployments, docker/vex, docker/nginx, docker/supabase entfernt)
- [x] Collector contracts dokumentiert
- [x] Schema validiert und migriert
- [x] Architecture/Dokumentation dem Code entsprechend (LEGACY-MATRIX, CONTRACTS)
