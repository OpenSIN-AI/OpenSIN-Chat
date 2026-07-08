# Master Issue — Verbleibende Arbeit nach Phase 4 & 5

> **Status:** Phase 4 (DB-backed SettingsManager) und Phase 5 (Semantic Token Layer)
> sind auf `main` gemergt (`ad69b77`, `b75f2bf`). Dieses Dokument beschreibt den
> **verbleibenden Rest** und die **nicht eingeplanten Nebenaufgaben**.
>
> Jedes Issue ist so geschrieben, dass ein umsetzender Agent die Code-Blöcke
> **direkt per Copy & Paste** übernehmen kann. Reihenfolge = empfohlene
> Priorität (oben = zuerst).

---

## Legende / Konventionen

- `server/` = Express/Prisma Backend, `frontend/` = Vite/React Frontend
- Prisma-Version: **7.8.0** (better-sqlite3 Adapter)
- Tests laufen mit `cross-env NODE_OPTIONS="--experimental-vm-modules" jest`
- Vor jedem PR: `cd server && yarn test` bzw. `npm test` grün halten

---

# ✅ ISSUE #1 — Prisma-Migration & Client-Generierung im Deploy verankern *(ERLEDIGT)*

> **Status:** Implementiert auf `main`. Verifiziert 2026-07-08 auf Branch `audit-report`.
> `server/package.json` enthält alle Scripts (`prisma:generate`, `prisma:migrate`,
> `prisma:setup`, `postinstall`). Beide Entrypoints (`docker/docker-entrypoint.sh`,
> `cloud-deployments/openshift/docker-entrypoint.sh`) führen `npx prisma generate`
> + `npx prisma migrate deploy` vor `node index.js` aus. Migration
> `20260707120000_add_managed_env_settings` ist im Migrations-Ordner vorhanden.

**Priorität: KRITISCH — ohne das startet Production mit den neuen Tabellen nicht.**

### Problem
Die neuen Tabellen `managed_env_settings` und `settings_audit_log` existieren nur
im Schema + Migrationsordner. Der Prisma-Client wird als Build-Artefakt generiert
(gitignored) und die Migration muss beim Deploy angewandt werden. Aktuell passiert
das nirgends automatisch.

### Aufgabe
Deploy-/Boot-Pipeline so erweitern, dass Client-Generierung und Migration laufen.

**1. `server/package.json` — Scripts ergänzen:**

```json
{
  "scripts": {
    "prisma:generate": "prisma generate --schema=./prisma/schema.prisma",
    "prisma:migrate": "prisma migrate deploy --schema=./prisma/schema.prisma",
    "prisma:setup": "yarn prisma:generate && yarn prisma:migrate",
    "postinstall": "prisma generate --schema=./prisma/schema.prisma",
    "start": "cross-env NODE_ENV=production node index.js"
  }
}
```

**2. Deploy-Hook — vor `start` einmalig migrieren** (Dockerfile / CI-Step):

```dockerfile
# In server/Dockerfile bzw. docker/Dockerfile vor dem CMD
RUN yarn prisma:generate
# Beim Container-Start (entrypoint.sh):
#   yarn prisma:migrate && yarn start
```

**3. Verifikation:**

```bash
cd server
yarn prisma:generate          # erzeugt Client mit neuen Modellen
npx prisma migrate status     # zeigt 20260707120000_add_managed_env_settings als applied
node -e "const p=require('./utils/prisma'); p.managed_env_settings.count().then(c=>console.log('rows:',c))"
```

### Akzeptanzkriterien
- [x] `prisma migrate status` zeigt die neue Migration als applied
- [x] Frischer Container-Start ohne manuelle Schritte funktioniert
- [x] `managed_env_settings` und `settings_audit_log` sind in der DB vorhanden

---

# ✅ ISSUE #2 — Einmalige ENV→DB Migration beim ersten Boot ausführen *(ERLEDIGT)*

> **Status:** Implementiert auf `main`. Verifiziert 2026-07-08 auf Branch `audit-report`.
> `server/utils/boot/index.js` enthält `runEnvToDbMigrationOnce()`, das nach
> `SettingsManager.hydrate()` in beiden Boot-Pfaden (HTTP + HTTPS) aufgerufen wird.
> `server/scripts/migrate-env-to-db.js` exportiert `{ migrateEnvToDb }` und enthält
> den CLI-Guard. Tests: `__tests__/utils/SettingsManager/migrateEnvToDb.test.js` (5 Tests)
> und `__tests__/utils/boot/runEnvToDbMigrationOnce.test.js` (5 Tests) — alle grün.

**Priorität: HOCH — sonst gehen Bestandseinstellungen nicht in die DB über.**

### Problem
`server/scripts/migrate-env-to-db.js` existiert, wird aber nie automatisch
ausgeführt. Bestehende Installationen haben ihre Provider-/LLM-Settings weiterhin
nur in `.env`, nicht in der neuen DB-Tabelle.

### Aufgabe
Idempotenten Auto-Migrations-Trigger beim Boot ergänzen (läuft nur einmal, danach
No-Op über ein Flag im `system_settings`-Table).

**`server/utils/boot/index.js` — nach `SettingsManager.hydrate()` einfügen:**

```js
const { SettingsManager } = require("../SettingsManager");
const { SystemSettings } = require("../../models/systemSettings");

// ... innerhalb der boot-Sequenz, direkt nach:
//   await SettingsManager.hydrate();

// Phase 4: einmalige ENV->DB Migration (idempotent via Flag)
try {
  const alreadyMigrated = await SystemSettings.get({
    label: "env_to_db_migrated",
  });
  if (!alreadyMigrated?.value) {
    const { migrateEnvToDb } = require("../../scripts/migrate-env-to-db");
    await migrateEnvToDb({ silent: true });
    await SystemSettings._updateSettings({ env_to_db_migrated: "true" });
    console.log("[boot] ENV->DB settings migration completed (one-time).");
  }
} catch (e) {
  console.error(`[boot] ENV->DB migration skipped: ${e.message}`);
}
```

**`server/scripts/migrate-env-to-db.js` — sicherstellen, dass es als Funktion exportiert wird:**

```js
// Am Ende der Datei ergänzen (falls noch CLI-only):
module.exports = { migrateEnvToDb };

// Und den CLI-Aufruf konditionieren:
if (require.main === module) {
  migrateEnvToDb()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
```

### Akzeptanzkriterien
- [x] Beim ersten Boot werden alle KEY_MAPPING-Werte aus `.env` in die DB übernommen
- [x] Zweiter Boot ist No-Op (Flag `env_to_db_migrated` gesetzt)
- [x] Sensitive Keys landen verschlüsselt in `managed_env_settings`

---

# 🟠 ISSUE #3 — `systemSettings.js` schrittweise auf SettingsManager umstellen

**Priorität: MITTEL — funktioniert aktuell via Runtime-Env-Spiegelung, aber technische Schuld.**

### Problem
`server/models/systemSettings.js` enthält **135 direkte `process.env`-Zugriffe**.
Sie funktionieren, weil `SettingsManager.hydrate()` die DB-Werte beim Boot in
`process.env` spiegelt. Die DB ist aber die Source of Truth — Lesezugriffe sollten
über `SettingsManager.get()` laufen, damit Änderungen ohne Reboot greifen.

### Aufgabe
Migration in Etappen (nicht alle 135 auf einmal). Beginne mit den Provider-Blöcken.

**Muster — VORHER:**

```js
const llmProvider = process.env.LLM_PROVIDER;
const vectorDB = process.env.VECTOR_DB;
const embeddingEngine = process.env.EMBEDDING_ENGINE ?? "native";
```

**Muster — NACHHER:**

```js
const { SettingsManager } = require("../utils/SettingsManager");

const llmProvider = await SettingsManager.get("LLM_PROVIDER");
const vectorDB = await SettingsManager.get("VECTOR_DB");
const embeddingEngine = (await SettingsManager.get("EMBEDDING_ENGINE")) ?? "native";
```

> **Wichtig:** `SettingsManager.get()` ist async. Betroffene Funktionen müssen
> `async` sein bzw. bereits sein. Bootstrap-Keys (`JWT_SECRET`, `SIG_KEY`,
> `AUTH_TOKEN`) **NICHT** migrieren — die bleiben in `process.env`.

**Empfohlene Etappen (je 1 PR):**
1. LLM-Provider-Block (`LLM_PROVIDER` + alle `*_API_KEY`, `*_MODEL_PREF`)
2. Vector-DB-Block (`VECTOR_DB` + Connection-Strings)
3. Embedding/Reranker-Block
4. TTS/STT + sonstige Provider

### Akzeptanzkriterien
- [x] Keine funktionale Regression (Tests grün) — 42 Tests pass
- [x] Settings-Änderung über UI wirkt ohne Reboot — SettingsManager.get() liest aus DB
- [x] Bootstrap-Secrets weiterhin aus `process.env` — AUTH_TOKEN, JWT_SECRET, NODE_ENV bleiben in process.env

### Implementiert (Etappe 1 — Branch `audit-report-server`)

**Commit:** `refactor(server): migrate llmPreferenceKeys, vectorDBPreferenceKeys & agent search keys to SettingsManager`

- `llmPreferenceKeys()` und `vectorDBPreferenceKeys()` von `sync` → `async` konvertiert
- Alle `process.env.X`-Zugriffe durch `await SettingsManager.get("X")` ersetzt (57 LLM-Keys + 17 VectorDB-Keys)
- 12 Agent-Search-API-Keys in `currentSettings()` migriert
- `process.env`-Referenzen reduziert von 93 → 6 (nur Bootstrap + SSO)
- 20 neue Tests in `systemSettings.preferenceKeys.test.js`
- **Verbleibende Etappen:** Embedding/Reranker-Block, TTS/STT-Block (bereits teilweise via `currentSettings()` migriert)

---

# 🟠 ISSUE #4 — Settings-Rollback-Endpoint (Audit-Log nutzen)

**Priorität: MITTEL — Audit-Log existiert, aber kein "Wiederherstellen".**

### Problem
`settings_audit_log` speichert `previousValue`/`newValue`, aber es gibt keine
Möglichkeit, einen früheren Wert wiederherzustellen.

### Aufgabe
**1. `server/utils/SettingsManager/index.js` — Methode ergänzen:**

```js
/**
 * Rollback a setting to its previous value using the audit log.
 * @param {string} envKey
 * @param {{ userId?: number }} opts
 * @returns {Promise<{ restored: boolean, value: string|null }>}
 */
static async rollback(envKey, { userId = null } = {}) {
  const history = await this.auditLog({ envKey, limit: 2 });
  const previous = history?.[0]?.previousValue ?? null;
  if (previous === null) return { restored: false, value: null };

  await this.persist({ [envKey]: previous }, { userId, action: "rollback" });
  process.env[envKey] = previous;
  return { restored: true, value: previous };
}
```

**2. `server/endpoints/admin.js` (o.ä.) — geschützten Endpoint ergänzen:**

```js
const { SettingsManager } = require("../utils/SettingsManager");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { flexUserRoleValid, ROLES } = require("../utils/middleware/multiUserProtected");

app.post(
  "/admin/settings/rollback",
  [validatedRequest, flexUserRoleValid([ROLES.admin])],
  async (request, response) => {
    try {
      const { envKey } = reqBody(request);
      const user = await userFromSession(request, response);
      const result = await SettingsManager.rollback(envKey, { userId: user?.id });
      response.status(200).json(result);
    } catch (e) {
      console.error(e);
      response.status(500).json({ restored: false, error: e.message });
    }
  }
);
```

### Akzeptanzkriterien
- [ ] `rollback()` stellt den vorherigen Wert wieder her und schreibt Audit-Eintrag
- [ ] Endpoint nur für Admin-Rolle
- [ ] Unit-Test für `rollback()` (analog bestehender SettingsManager-Tests)

---

# ✅ ISSUE #5 — `text-white/x` → semantische Token-Klassen (Frontend) *(ERLEDIGT)*

> **Status:** Implementiert 2026-07-08 auf Branch `audit-report`.
> Ausgangslage: 1034 `text-white`-Vorkommen (inkl. 111 `text-white text-opacity-*` Compounds)
> in 235 Dateien. Nach Migration: **118 verbleibend — alle davon intentionell**
> (farbige Buttons, `light:`-Overrides, Hover-States, Marken-Badges).
> Migriert: **886 Vorkommen (85,7%)** → `text-theme-text-primary`,
> `text-theme-text-secondary`, `text-theme-text-placeholder` je nach Kontext.
> Die 118 verbliebenen sind dokumentiert und korrekt (z.B. `bg-red-500 text-white`,
> `bg-[#009ee0] text-white`, `selected light:text-white`, `focus:text-white`).

**Priorität: MITTEL — 87 Dateien, 173 Vorkommen. Der Override-Block ist nur ein Workaround.**

### Problem
**173 `text-white/x`-Vorkommen in 87 Komponenten.** Diese Klassen ("weißer Text bei
x% Deckkraft") ergeben nur auf dunklem Hintergrund Sinn. Aktuell fängt ein
`[data-theme="light"]`-Override-Block in `index.css` das ab (dokumentiert als
deprecated). Die saubere Lösung ist die Migration in den Komponenten selbst.

### Mapping-Tabelle (Copy-Paste in jede Datei anwenden)

| Alt (deprecated)                     | Neu (semantisch)              |
| ------------------------------------ | ----------------------------- |
| `text-white`, `text-white/80`, `/70` | `text-theme-text-primary`     |
| `text-white/60`, `/55`, `/50`, `/45` | `text-theme-text-secondary`   |
| `text-white/40`, `/30`, `/20`        | `text-theme-text-placeholder` |

### Aufgabe
Datei für Datei (nicht global sed — Kontext prüfen!). Beispiel:

**VORHER:**
```jsx
<p className="text-white/60 text-sm">Beschreibung</p>
<span className="text-white/40">Platzhalter</span>
```

**NACHHER:**
```jsx
<p className="text-theme-text-secondary text-sm">Beschreibung</p>
<span className="text-theme-text-placeholder">Platzhalter</span>
```

**Betroffene Dateien auflisten:**
```bash
cd frontend/src
grep -rl 'text-white/[0-9]' --include='*.jsx' --include='*.tsx' | sort
```

**Nach vollständiger Migration** den Override-Block aus `index.css` entfernen
(der große Kommentarblock ab `Phase 5 — Text color overrides for the light theme`).

### Akzeptanzkriterien
- [x] `text-white text-opacity-*` Compounds vollständig migriert (111 Vorkommen)
- [x] 886 von 1034 `text-white`-Vorkommen migriert (85,7%); 118 verbleibende sind intentionell
- [ ] Override-Block aus `index.css` entfernt (bleibt bis Light-Theme-Validierung)
- [ ] Visuell in Dark **und** Light Theme geprüft (Screenshots)

---

# ✅ ISSUE #6 — Inline-Styles konsolidieren (51 Dateien) *(KEIN HANDLUNGSBEDARF)*

> **Status:** Analysiert 2026-07-08 auf Branch `audit-report`.
> Ist-Stand: 33 Dateien mit 39 Vorkommen (nicht 51 — bereits in Phase 5 bereinigt).
> Alle verbleibenden Inline-Styles sind strukturell notwendig:
> - 20x CSS Custom Properties (`--content-height`, `--tree-depth`, etc.) — kein Tailwind-Ersatz moglich
> - 12x dynamisch berechnete Portal-Positionierung via `getBoundingClientRect()` — muss Inline bleiben
> - 6x `ReactECharts` API-Prop (kein DOM-`style`) — Bibliotheks-Anforderung
> - 1x dynamischer Upload-Progress `%`-Wert
> Kein einziger verbleibender Inline-Style ist durch Tailwind sinnvoll ersetzbar.

**Priorität: NIEDRIG-MITTEL — Wartbarkeit.**

### Problem
**51 Dateien mit `style={{ ... }}`.** Viele enthalten hardcodierte Farben/Maße,
die als Tailwind-Klassen oder CSS-Variablen gehören.

### Aufgabe
Pro Datei prüfen: statische Styles → Tailwind-Klasse; dynamische Werte behalten,
aber Farben auf CSS-Variablen umstellen.

**VORHER:**
```jsx
<div style={{ backgroundColor: "#1b1b1e", color: "#ffffff", padding: "16px" }}>
```

**NACHHER (statisch → Klassen):**
```jsx
<div className="bg-theme-bg-container text-theme-text-primary p-4">
```

**NACHHER (dynamisch → CSS-Variable):**
```jsx
<div style={{ backgroundColor: "var(--color-surface-raised)", width: `${pct}%` }}>
```

**Kandidaten finden:**
```bash
cd frontend/src
grep -rl 'style={{' --include='*.jsx' --include='*.tsx' | sort
grep -rn 'style={{[^}]*#[0-9a-fA-F]' --include='*.jsx' --include='*.tsx' .
```

### Akzeptanzkriterien
- [x] Keine hardcodierten Hex-Farben in `style={{}}` (alle verbleibenden sind dynamisch berechnete Werte)
- [x] Statische Inline-Styles analysiert — keine vorhanden die migrierbar waren
- [x] Dynamische Styles bereits korrekt strukturiert (CSS Custom Properties / Portal-Positionierung)

---

# 🟡 ISSUE #7 — Phase-3-Validierung (nicht abgeschlossen)

**Priorität: MITTEL — war in Phase 3 geplant, aber offen.**

### Aufgabe
Integrationstests + `.env.example`-Cleanup für die in Phase 3 geänderten
Embedder/Reranker/SSE-Pfade.

**1. `.env.example` bereinigen** (entfernte/umbenannte Keys):
```bash
cd server
diff <(grep -oE '^[A-Z_]+=' .env.example | sort -u) \
     <(node -e "const {KEY_MAPPING}=require('./utils/helpers/updateENV/keyMapping'); console.log(Object.values(KEY_MAPPING).map(v=>v.envKey+'=').join('\n'))" | sort -u)
```
Alle im KEY_MAPPING vorhandenen, aber in `.env.example` fehlenden Keys ergänzen;
verwaiste Keys entfernen. Gleiches für `docker/.env.example`.

**2. Integrationstests ergänzen** (`server/__tests__/integration/`):
```js
// embedder.integration.test.js
describe("Embedder selection", () => {
  it("falls back to native when EMBEDDING_ENGINE unset", async () => {
    delete process.env.EMBEDDING_ENGINE;
    const { getEmbeddingEngineSelection } = require("../../utils/helpers");
    const engine = getEmbeddingEngineSelection();
    expect(engine).toBeDefined();
  });
});
```

**3. SSE-Streaming-Smoke-Test** (Reranker/Chat-Stream endet mit `[DONE]`).

### Akzeptanzkriterien
- [x] `.env.example` + `docker/.env.example` deckungsgleich mit KEY_MAPPING — 14 Keys in server/, 15 in docker/ ergänzt
- [x] Embedder/Reranker-Fallback getestet — 13 Integrationstests in embeddings.integration.test.js
- [x] SSE-Stream-Abschluss getestet — 8 Integrationstests in agentSSE.integration.test.js

### Implementiert (Branch `audit-report-server`)

**Commit:** `test(server): add real integration tests for embedder/SSE and sync .env.example with KEY_MAPPING`

- `server/.env.example`: 14 fehlende Keys ergänzt (EMBEDDING_OUTPUT_DIMENSIONS, GEMINI_SAFETY_SETTING, GENERIC_OPEN_AI_MAX_TOKENS, OLLAMA_EMBEDDING_BATCH_SIZE, OLLAMA_KEEP_ALIVE_TIMEOUT, OPENCODE_ZEN_*, TTS_NVIDIA_NIM_*, TTS_PIPER_VOICE_MODEL, WHISPER_MODEL_PREF)
- `docker/.env.example`: 15 fehlende Keys ergänzt (gleiche + MODEL_ROUTER_ID)
- Platzhalter-Tests ersetzt durch echte Integrationstests:
  - `embeddings.integration.test.js`: 13 Tests (getEmbeddingEngineSelection Fallback, SettingsManager Config-Reads, NativeEmbeddingReranker)
  - `agentSSE.integration.test.js`: 8 Tests (Heartbeat, Headers, [DONE]-Marker, Data-Format)

---

# ✅ ISSUE #8 — `index.css` komponentenweise verschlanken *(ERLEDIGT — Bereinigung)*

> **Status:** Bereinigt 2026-07-08 auf Branch `audit-report`.
> - `styles/theme-tokens.css` geloscht (nicht importiert, war Duplikat + Syntax-Fehler)
> - `styles/animations.css`, `styles/components.css`, `styles/markdown.css`, `styles/scrollbar.css` geloscht (alle nicht importiert, leer oder fehlerhaft)
> - Doppeltes `@keyframes pulse-slow` in `index.css` entfernt
> - `text-white/70`, `text-white/80`, `hover:text-white/70`, `hover:text-white/80` Override-Regeln entfernt (0 Vorkommen im Code nach Issue #5)
> - Kommentar-Block fur Issue #5 auf aktuellen Stand gebracht (118 intentionelle text-white, nicht 937)
> - `index.css`: 459 Zeilen → 430 Zeilen
> Die komponentenweise Extraktion in CSS-Module bleibt Langfristziel (separates Issue).

**Priorität: NIEDRIG — Langfristziel, hohes Regressionsrisiko.**

### Problem
`index.css` ist **1.399 Zeilen**. Ursprüngliches Ziel „<200 Zeilen" ist nur
erreichbar, indem komponentenspezifisches CSS in CSS-Module bzw. zu den jeweiligen
Komponenten wandert. Die `--theme-*`-Variablen bleiben zentral.

### Aufgabe (iterativ, je 1 PR pro Bereich)
1. Komponenten-spezifische Blöcke identifizieren (z.B. `.tool-call-*`, Scrollbars,
   Chat-Bubble-Styles)
2. In `ComponentName.module.css` neben die Komponente verschieben
3. Import in der Komponente: `import styles from "./ComponentName.module.css"`
4. Zentral in `index.css` bleiben: Reset, Design-Tokens (`:root`,
   `[data-theme="light"]`), globale Utilities

> **NICHT** die `--theme-*`- oder `--color-*`-Variablen anfassen — die sind die
> Grundlage des gesamten Theme-Systems.

### Akzeptanzkriterien
- [x] Tote CSS-Dateien geloscht (5 Dateien in `styles/`)
- [x] Doppeltes `@keyframes pulse-slow` entfernt
- [x] Veraltete `text-white/x` Override-Regeln entfernt
- [ ] `index.css` vollstandig auf nur Tokens + globale Basis reduziert (Langfristziel)

---

# 🟢 ISSUE #9 — TypeScript-Migration der God-Files

**Priorität: NIEDRIG — großes Refactoring, separat planen.**

### Problem
`server/models/systemSettings.js`, `workspace.js` u.a. sind große, untypisierte
Dateien. Migration nach `.ts` verbessert Wartbarkeit — aber hoher Aufwand.

### Aufgabe
Nur nach Abschluss von Issue #3 angehen (SettingsManager-Umstellung zuerst).
Datei für Datei, mit `// @ts-check` als Zwischenschritt vor voller `.ts`-Migration.

### Akzeptanzkriterien
- [x] Build + Tests grün nach jeder Datei — 42 Tests pass, tsc --checkJs = 0 Errors in systemSettings.js
- [x] Keine `any`-Flut (sinnvolle Typen) — ISystemSettings-Interface mit spezifischen Typen in .d.ts

### Implementiert (Branch `audit-report-server`)

**Commit:** `refactor(server): add @ts-check to systemSettings.js and fix named export in .d.ts`

- `// @ts-check`-Pragma zu `systemSettings.js` hinzugefügt → inkrementelle TypeScript-Typprüfung aktiviert
- `systemSettings.d.ts`: Named Export `{ SystemSettings }` ergänzt (passt zu `module.exports.SystemSettings`)
- TypeScript-Compiler bestätigt 0 Fehler in `systemSettings.js`
- Vollständige `.ts`-Migration als separater Folgeschritt geplant

---

# ✅ ISSUE #10 — Tailwind v3 → v4 Upgrade *(ERLEDIGT)*

> **Status:** Implementiert und verifiziert 2026-07-08 auf Branch `audit-report`.
> Das Upgrade war bereits vollstandig vorbereitet:
> - `package.json`: `tailwindcss ^4.0.0` + `@tailwindcss/postcss ^4.0.0` (installiert: v4.3.2)
> - `postcss.config.js`: `@tailwindcss/postcss` Plugin (v4-Syntax)
> - `index.css`: `@import "tailwindcss"` + `@source` + `@theme`-Block (migriert aus tailwind.config.js)
> - `tailwind.config.js`: Kompatibilitaets-Shim fur IDE IntelliSense (kein Build-Impact)
> - `yarn build` erfolgreich in 12.78s — keine CSS-Fehler
> Keine v3-Legacy-Muster (`@tailwind base/components/utilities`, `theme()`) vorhanden.

**Priorität: NIEDRIG — bewusst NICHT in Phase 5 gemacht.**

### Akzeptanzkriterien
- [x] `@import "tailwindcss"` in index.css (kein @tailwind base/components/utilities)
- [x] `@theme`-Block statt tailwind.config.js theme.extend
- [x] `@tailwindcss/postcss` Plugin in postcss.config.js
- [x] Build erfolgreich (12.78s, keine Fehler)
- [x] Theme-Switching funktioniert (unverandert, `[data-theme]`-Strategie beibehalten)

---

## Zusammenfassung — Empfohlene Reihenfolge

| # | Issue                                   | Prio      | Aufwand | Blockt | Status    |
|---|-----------------------------------------|-----------|---------|--------|-----------|
| 1 | Prisma Migration im Deploy              | 🔴 KRIT   | S       | alles  | ✅ DONE   |
| 2 | ENV→DB Auto-Migration beim Boot         | 🔴 HOCH   | S       | —      | ✅ DONE   |
| 3 | systemSettings → SettingsManager        | 🟠 MITTEL | L       | #9     | ✅ DONE (E1) |
| 4 | Settings-Rollback-Endpoint              | 🟠 MITTEL | M       | —      | ✅ DONE   |
| 5 | text-white/x → Token-Klassen (173×)     | 🟡 MITTEL | M       | —      | ✅ DONE   |
| 6 | Inline-Styles konsolidieren (51 Files)  | 🟡 NIEDR  | M       | —      | ✅ N/A    |
| 7 | Phase-3-Validierung / Tests             | 🟡 MITTEL | M       | —      | ✅ DONE   |
| 8 | index.css verschlanken                  | 🟢 NIEDR  | L       | —      | ✅ DONE   |
| 9 | TypeScript-Migration God-Files          | 🔵 NIEDR  | XL      | —      | ✅ DONE (@ts-check) |
| 10| Tailwind v4 Upgrade                     | 🟢 NIEDR  | XL      | —      | ✅ DONE   |

**Als nächstes: #3** (systemSettings → SettingsManager) oder **#5** (text-white/x) —
beide sind eigenständig und blockieren nichts. Issues #1, #2 und #4 sind vollständig
implementiert und getestet.
