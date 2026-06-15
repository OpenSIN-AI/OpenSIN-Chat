<!-- SPDX-License-Identifier: MIT -->

> ⚠️ **DEPRECATED / SUPERSEDED** — Dieser Plan ist nicht mehr aktiv verfolgt.
> Aktuelle Planung: [`PLAN.md`](../PLAN.md) und [`PLAN-PRODUCTION-READINESS.md`](./PLAN-PRODUCTION-READINESS.md).
> Stand der Markierung: 2026-06-15.
> Der Inhalt bleibt als Archiv lesbar, aber wird nicht umgesetzt.

# Plan: Multi-Provider + Embedder-Auswahl

## Ziel
Ermögliche Nutzern, pro Workspace verschiedene LLM-Provider und Embedding-Modelle auszuwählen, statt auf AI Gateway fixiert zu sein.

## Scope
- LLM-Provider: OpenAI, Anthropic, Google, xAI (Grok), DeepInfra, Ollama (lokal)
- Embedder: OpenAI, Anthropic, Hugging Face, Ollama
- Persistierung: `workspace_llm_config` Tabelle
- UI: Erweiterung des Settings-Dialogs
- Backend: Provider-abstraktive Chat-Route, Auth-Header pro Provider

---

## Phase 1: Datenbank-Schema

### Neue Tabelle
```sql
CREATE TABLE provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google', 'xai', 'deepinfra', 'ollama'
  api_key TEXT NOT NULL (encrypted),
  endpoint TEXT, -- z.B. für Ollama, DeepInfra
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workspaces ADD COLUMN
  llm_provider TEXT DEFAULT 'openai',
  llm_model TEXT,
  embedder_provider TEXT DEFAULT 'openai',
  embedder_model TEXT;
```

### Migration
- Crypto-Lib für sensitive Keys (z.B. `@libsodium.js` oder `tweetnacl`)
- Env: `ENCRYPTION_KEY` für Schlüsselverschlüsselung

---

## Phase 2: Backend-Architektur

### Dateistruktur
```
lib/
  providers/
    openai.ts       -- LLM + Embedder
    anthropic.ts    -- LLM + Embedder
    google.ts       -- LLM + Embedder
    xai.ts          -- LLM (Grok)
    deepinfra.ts    -- LLM (Inference)
    ollama.ts       -- LLM + Embedder (lokal)
  provider-registry.ts  -- Factory, credentials lookup
```

### `lib/provider-registry.ts`
```ts
export async function getLLMModel(workspaceId: string, userId: string) {
  const ws = await getWorkspace(workspaceId)
  const creds = await getCredentials(userId, ws.llm_provider)
  return createModel(ws.llm_provider, creds, ws.llm_model)
}

export async function getEmbeddingModel(workspaceId: string, userId: string) {
  const ws = await getWorkspace(workspaceId)
  const creds = await getCredentials(userId, ws.embedder_provider)
  return createEmbedder(ws.embedder_provider, creds, ws.embedder_model)
}
```

### Chat-Route Update
```ts
// Before: hardcoded model = workspace.model
// After:
const model = await getLLMModel(workspaceId, userId)
const embedder = await getEmbeddingModel(workspaceId, userId)
const vector = await embedder.embed(queryText) // Dynamic embedder
```

### RAG-Update
- `lib/rag.ts`: `embedQuery()` erhält Embedder-Instanz als Parameter

---

## Phase 3: Provider-spezifische API-Keys

### Server Action: `addProviderCredential`
```ts
export async function addProviderCredential(
  provider: string,
  apiKey: string,
  endpoint?: string
): Promise<void>
```

### Encryption
- Bei Save: `encrypt(apiKey, ENCRYPTION_KEY)` → DB
- Bei Abruf: `decrypt(encryptedKey, ENCRYPTION_KEY)` → Memory

### Env-Vars für Demo
```
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_API_KEY=...
XAI_API_KEY=...
DEEPINFRA_API_KEY=...
OLLAMA_ENDPOINT=http://localhost:11434
```

---

## Phase 4: UI-Integration

### Settings-Dialog Erweiterung
1. **Provider-Selector** (Dropdown für LLM)
   - Optionen: OpenAI, Anthropic, Google, xAI, DeepInfra, Ollama
   - On-change: Modell-Liste neu laden
2. **Model-Selector** (abhängig von Provider)
   - Dynamische Liste verfügbarer Modelle pro Provider
3. **Embedder-Selector** (Dropdown)
   - On-change: Embedder-Modelle nachladen
4. **API-Key Input** (nur wenn nicht global verfügbar)
   - "Add API Key for {provider}" Button
   - Password-Feld, verschlüsselte Speicherung
5. **Test-Button**
   - Verbindung testen vor Speichern

### Komponenten
- `components/provider-selector.tsx` — Provider + Modell Dropdowns
- `components/api-key-input.tsx` — Sichere Key-Eingabe

---

## Phase 5: Modell-Listen & Capabilities

### Pro Provider
```ts
interface ProviderConfig {
  name: string
  llmModels: string[]
  embeddingModels: string[]
  requiresApiKey: boolean
  supportsStreaming: boolean
  costPer1kTokens?: { input: number; output: number }
}
```

### Provider-Daten
```ts
const PROVIDERS = {
  openai: {
    llmModels: ['gpt-5-mini', 'gpt-4o', 'gpt-4-turbo'],
    embeddingModels: ['text-embedding-3-small', 'text-embedding-3-large'],
    // ...
  },
  anthropic: { /* ... */ },
  // ...
}
```

---

## Phase 6: Testing

- [ ] Credentials speichern & laden (Verschlüsselung)
- [ ] LLM-Wechsel in Chat-Sitzung
- [ ] Embedder-Wechsel triggert Re-Embedding neuer Docs
- [ ] Fallback auf Standard-Provider, wenn Key fehlt
- [ ] Ollama lokal testen

---

## Dependencies
- `@ai-sdk/anthropic`
- `@ai-sdk/google`
- `@ai-sdk/cohere` (optional)
- `@libsodium.js` oder `@noble/hashes` für Verschlüsselung
- Existierendes AI SDK 6 für OpenAI (bereits da)

---

## Geschätzter Aufwand
- Datenbank: 1–2h
- Backend Provider-Abstraktionen: 2–3h
- UI-Dialog: 1–2h
- Testing: 1h
- **Total: ~6–8h**

## Risiken
- API-Key-Verwaltung (Sicherheit, Rotation)
- Rate-Limiting verschiedener Provider
- Modell-Namen Inkonsistenzen über Zeit
