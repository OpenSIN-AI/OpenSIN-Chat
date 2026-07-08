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
- [ ] Keine funktionale Regression (Tests grün)
- [ ] Settings-Änderung über UI wirkt ohne Reboot
- [ ] Bootstrap-Secrets weiterhin aus `process.env`

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

# 🟡 ISSUE #5 — `text-white/x` → semantische Token-Klassen (Frontend)

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
- [ ] 0 Vorkommen: `grep -r 'text-white/[0-9]' frontend/src` leer
- [ ] Override-Block aus `index.css` entfernt
- [ ] Visuell in Dark **und** Light Theme geprüft (Screenshots)

---

# 🟡 ISSUE #6 — Inline-Styles konsolidieren (51 Dateien)

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
- [ ] Keine hardcodierten Hex-Farben mehr in `style={{}}`
- [ ] Statische Inline-Styles auf Tailwind migriert
- [ ] Dynamische Styles nutzen `var(--*)` Tokens

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
- [ ] `.env.example` + `docker/.env.example` deckungsgleich mit KEY_MAPPING
- [ ] Embedder/Reranker-Fallback getestet
- [ ] SSE-Stream-Abschluss getestet

---

# 🟢 ISSUE #8 — `index.css` komponentenweise verschlanken

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
- [ ] `index.css` enthält nur noch Tokens + globale Basis
- [ ] Kein visueller Regress (Dark + Light)

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
- [ ] Build + Tests grün nach jeder Datei
- [ ] Keine `any`-Flut (sinnvolle Typen)

---

# 🟢 ISSUE #10 — Tailwind v3 → v4 Upgrade (separates Projekt)

**Priorität: NIEDRIG — bewusst NICHT in Phase 5 gemacht.**

### Warum nicht erledigt
Das Projekt nutzt:
- `@tremor/react` (an Tailwind v3 gebunden)
- `darkMode: "class"` + `[data-theme]`-Attribut-Switching
- Umfangreiche `theme.extend`-Config

Ein naives v4-Upgrade (`@import "tailwindcss"`, `@theme`-Block) würde all das
brechen. Das braucht ein **eigenes, getestetes Upgrade-Projekt**.

### Aufgabe (wenn angegangen)
1. Kompatibilität `@tremor/react` mit Tailwind v4 prüfen (ggf. Alternative)
2. `tailwind.config.js` → `@theme`-Block in `index.css` migrieren
3. `darkMode`/`[data-theme]`-Strategie auf v4-Syntax umstellen
4. Alle `--theme-*`-Tokens in `@theme` überführen
5. Vollständiger visueller Regressionstest (Dark + Light, alle Views)

### Akzeptanzkriterien
- [ ] `@tremor/react` funktioniert (oder ersetzt)
- [ ] Theme-Switching funktioniert
- [ ] Kein visueller Regress

---

## Zusammenfassung — Empfohlene Reihenfolge

| # | Issue                                   | Prio      | Aufwand | Blockt | Status    |
|---|-----------------------------------------|-----------|---------|--------|-----------|
| 1 | Prisma Migration im Deploy              | 🔴 KRIT   | S       | alles  | ✅ DONE   |
| 2 | ENV→DB Auto-Migration beim Boot         | 🔴 HOCH   | S       | —      | ✅ DONE   |
| 3 | systemSettings → SettingsManager        | 🟠 MITTEL | L       | #9     | OFFEN     |
| 4 | Settings-Rollback-Endpoint              | 🟠 MITTEL | M       | —      | ✅ DONE   |
| 5 | text-white/x → Token-Klassen (173×)     | 🟡 MITTEL | M       | —      | OFFEN     |
| 6 | Inline-Styles konsolidieren (51 Files)  | 🟡 NIEDR  | M       | —      | OFFEN     |
| 7 | Phase-3-Validierung / Tests             | 🟡 MITTEL | M       | —      | OFFEN     |
| 8 | index.css verschlanken                  | 🟢 NIEDR  | L       | —      | OFFEN     |
| 9 | TypeScript-Migration God-Files          | 🟢 NIEDR  | XL      | —      | OFFEN     |
| 10| Tailwind v4 Upgrade                     | 🟢 NIEDR  | XL      | —      | OFFEN     |

**Als nächstes: #3** (systemSettings → SettingsManager) oder **#5** (text-white/x) —
beide sind eigenständig und blockieren nichts. Issues #1, #2 und #4 sind vollständig
implementiert und getestet.
