# Security & Performance Audit Report — OpenSIN-Chat

**Datum:** 2026-07-07  
**Auditor:** Security & Performance Audit Agent  
**Repo:** `/home/user/opensin-chat`

---

## 1. CSP Header — `server/utils/middleware/securityHeaders/index.js`

### [LOW] securityHeaders/index.js:56 — `object-src 'self'` ist NICHT zu restriktiv, aber unüblich

`object-src 'self'` erlaubt `<object>`/`<embed>` von eigener Origin. Die Best Practice ist `object-src 'none'`, da moderne Web-Apps `<object>`/`<embed>` nicht benötigen. `'self'` ist ein unnötiges Angriffsfläche-Risiko (z.B. für SWF/PDF-Embedding-Angriffe).

**Vorgeschlagener Fix:** `object-src 'none'` setzen.

### [MEDIUM] securityHeaders/index.js:56 — `upgrade-insecure-requests` fehlt

Die CSP enthält nicht `upgrade-insecure-requests`. Diese Direktive weist den Browser an, alle HTTP-Requests automatisch auf HTTPS upzugraden. Ohne sie kann gemischter Content (mixed content) auftreten, wenn ein Client versehentlich HTTP-Ressourcen lädt.

**Vorgeschlagener Fix:** `upgrade-insecure-requests` zur CSP hinzufügen:
```js
"default-src 'self'",
"upgrade-insecure-requests",
```

### [INFO] securityHeaders/index.js:93-96 — HSTS nur bedingt aktiviert

HSTS wird nur gesetzt, wenn `ENABLE_HSTS=true`. Das ist bewusst so dokumentiert (vermeidet Lockout bei broken TLS), aber im Produktivbetrieb sollte dies zwingend aktiv sein.

**Empfehlung:** Sicherstellen, dass `ENABLE_HSTS=true` in Produktiv-Umgebung gesetzt ist.

### [INFO] securityHeaders/index.js:60 — `X-XSS-Protection: 1; mode=block` ist veraltet

Dieser Header ist in modernen Browsern veraltet und kann in Edge-Cases sogar XSS-Schwachstellen einführen. Chrome/Edge/Firefox ignorieren ihn mittlerweile.

**Vorgeschlagener Fix:** Entfernen oder auf `0` setzen, da CSP der moderne Schutzmechanismus ist.

---

## 2. Rate Limiting — `server/utils/middleware/simpleRateLimit/index.js`

### [INFO] simpleRateLimit/index.js — Implementierung ist solide

Die Middleware ist gut implementiert:
- IP-basiertes und account-basiertes Rate-Limiting
- Redis-Backend mit In-Memory-Fallback
- `DISABLE_RATE_LIMITS=true` wird in Produktion blockiert (`process.exit(1)`)
- `MAX_TRACKED_KEYS = 10000` verhindert Memory-Leaks
- `Retry-After` und `X-RateLimit-*` Header werden gesetzt
- Cloudflare `cf-connecting-ip` wird bewusst NICHT vertraut (Spoofing-Schutz)

### [MEDIUM] simpleRateLimit/index.js:5 — In-Memory-Backend nicht für Multi-Instance geeignet

Wenn `RATE_LIMIT_BACKEND` nicht auf `redis` gesetzt ist, funktioniert Rate-Limiting nur pro Instanz. Bei horizontaler Skalierung kann ein Angreifer Requests über verschiedene Instanzen verteilen.

**Vorgeschlagener Fix:** In Produktiv-Umgebung mit mehreren Instanzen `RATE_LIMIT_BACKEND=redis` zwingend setzen.

### [HIGH] endpoints/system.js (auth) — Kein Rate-Limiting auf Login/Password-Recovery-Endpoints

Die gefundenen Rate-Limits decken admin, enhance-prompt, openai, orchestrator, politician ab. Es fehlt explizites Rate-Limiting auf:
- Login-Endpoint (`/api/system/login` o.ä.)
- Password-Recovery-Endpoint
- Registrierungs-Endpoint

Diese sind primäre Ziele für Brute-Force- und Credential-Stuffing-Angriffe.

**Vorgeschlagener Fix:** `simpleRateLimit({ bucket: "auth-login", max: 10, windowMs: 60 * 1000, identity: "user" })` auf Login/Recovery-Endpoints anwenden.

### [LOW] endpoints/api/openai/index.js:28 — OpenAI Rate-Limit mit 100/min ggf. zu hoch

100 Requests/Minute pro IP für den OpenAI-kompatiblen Endpoint kann Kostenspiralen ermöglichen, wenn ein Angreifer viele Requests sendet.

**Vorgeschlagener Fix:** Limit auf 30-50/min reduzieren oder nach Authentifizierungs-Level staffeln.

---

## 3. Bundle Size — `frontend/vite.config.js`

### [INFO] vite.config.js:68-190 — Code-Splits sind gut optimiert

Die `manualChunks`-Konfiguration ist umfangreich und durchdacht:
- `vendor-katex`, `vendor-highlight`, `vendor-markdown`, `vendor-tts`, `vendor-pdf`, `vendor-cron`, `vendor-speech`, `vendor-qrcode`, `vendor-i18n`, `vendor-state`, `vendor-ui`, `vendor-router`, `vendor-charts`, `vendor-icons`, `vendor-lucide`, `vendor-aria`, `vendor-polyfill`, `vendor-utils`, `vendor-utils2`
- React bewusst im Main-Chunk (vermeidet TDZ-Race-Condition)
- Recharts/d3/@tremor bewusst in Route-Chunks (gleicher Race-Reason)
- `external` schließt ungenutzte SSR-Variante aus

### [LOW] vite.config.js:71 — `chunkSizeWarningLimit: 2000` maskiert große Bundles

Die Warnschwelle wurde auf 2000 KB angehoben. Das ist legitim wegen SSR-Entry-Pinning, aber es unterdrückt Warnungen für Bundles, die zwischen 500-2000 KB liegen.

**Vorgeschlagener Fix:** Regelmäßig `bundleinspector.html` (visualizer) prüfen, oder CI-Budget mit `vite-plugin-bundle-analyzer` enforce.

### [LOW] vite.config.js:64 — `entryFileNames: 'index.js'` verhindert Content-Hashing

Da der Entry-Dateiname auf `index.js` gepinnt ist (SSR-Anforderung), kann der Browser nicht durch Hash-basierten Dateinamen Cache-Busting durchführen. Vendor-Chunks haben jedoch automatische Hashes.

**Vorgeschlagener Fix:** Akzeptabel für SSR-Setup, aber sicherstellen, dass `Cache-Control: no-cache` für `index.js` gesetzt wird und Vendor-Chunks `immutable` cachen.

---

## 4. Database Queries — N+1 Query Patterns in `server/models/`

### [HIGH] models/documents.js:309-315 — N+1 beim Dokumenten-Removal

```js
for (const path of removals) {
  const document = await this.get({ docpath: path, workspaceId: workspace.id });
  ...
}
```
Jeder Pfad löst eine separate `get()`-Query aus. Bei N Removals = N+1 Queries.

**Vorgeschlagener Fix:** Batch-Query mit `where: { docpath: { in: removals }, workspaceId: workspace.id }`.

### [HIGH] models/documents.js:333-340 — N+1 beim Löschen im Transaction

```js
for (const document of resolvedDocs) {
  await tx.workspace_documents.delete({ where: { id: document.id } });
  await tx.document_vectors.deleteMany({ where: { docId: document.docId } });
}
```
2N Queries innerhalb einer Transaction für N Dokumente.

**Vorgeschlagener Fix:** `deleteMany({ where: { id: { in: resolvedDocIds } } })` und `deleteMany({ where: { docId: { in: resolvedDocIds } } })`.

### [MEDIUM] models/documents.js:158 — Sequentielles Embedding in Loop

```js
for (const [index, path] of additions.entries()) {
  // await fileData(path), await embedding...
}
```
Bewusst sequentiell (laut Kommentar: vermeidet Duplicate-Embedding), aber bei vielen Dokumenten sehr langsam. Kein echtes N+1, aber Performance-Flaschenhals.

**Vorgeschlagener Fix:** Parallelisierung mit Dedup-Logik oder Batch-Embedding-API nutzen.

### [HIGH] models/invite.js:91-103 — N+1 beim Workspace-Invite

```js
for (const workspaceId of validWorkspaceIds) {
  const existing = await tx.workspace_users.findFirst({ ... });
  if (!existing) await tx.workspace_users.create({ ... });
}
```
Pro Workspace: 1-2 Queries. Bei N Workspaces = bis zu 2N Queries.

**Vorgeschlagener Fix:** Batch-Check mit `findMany({ where: { user_id, workspace_id: { in: validWorkspaceIds } } })`, dann `createMany` für fehlende.

### [INFO] models/apiKeys.js:105-130 — `whereWithUser` ist gut gelöst

```js
const userIds = [...new Set(apiKeys.filter(...).map(...))];
const users = userIds.length > 0 ? await User.where({ id: { in: userIds } }) : [];
```
Batch-Fetch mit `IN`-Clause, dann In-Memory-Join. Kein N+1 — vorbildlich.

---

## 5. Cookie Security

### [INFO] — Keine `res.cookie()` Aufrufe in Application-Code

In `server/endpoints/`, `server/utils/` und `server/models/` wurden **keine** `res.cookie()` oder `res.clearCookie()` Aufrufe gefunden. Die einzigen Treffer sind in `node_modules/` (MCP SDK Demo-Code, Express-Docs).

Die App verwendet JWT-Tokens im `Authorization`-Header statt Cookies. Das bedeutet:
- ✅ Keine Cookie-basierte Session-Fixation-Risiken
- ✅ Keine CSRF-Risiken über Cookies
- ⚠️ Tokens müssen client-seitig sicher gespeichert werden (localStorage hat XSS-Risiko)

### [LOW] — Falls in Zukunft Cookies verwendet werden

Sollte die App jemals Cookies einführen (z.B. für OAuth-Flows), sicherstellen, dass gesetzt wird:
```js
res.cookie('name', value, {
  httpOnly: true,    // verhindert XSS-Zugriff
  secure: true,      // nur über HTTPS
  sameSite: 'strict', // verhindert CSRF
  maxAge: 3600000,   // begrenzte Lebensdauer
});
```

---

## 6. API Key Exposure

### [INFO] — Keine API-Key/Secret/Password/Token Leaks in Logs gefunden

Grep über `server/utils/`, `server/endpoints/`, und `server/models/` nach `console.log/info/warn/error` mit `apiKey|api_key|secret|password|token` fand **keine Treffer** in Application-Code.

### [INFO] models/apiKeys.js:14-17 — `_stripSecret` ist vorbildlich

```js
_stripSecret: function (apiKey) {
  if (!apiKey) return null;
  const { secret: _secret, ...rest } = apiKey;
  return rest;
}
```
Secrets werden vor dem Return systematisch entfernt. `get()` und `where()` verwenden `_stripSecret`.

### [LOW] models/apiKeys.js:33 — `create()` returnt das Secret im Klartext

```js
const apiKey = await prisma.api_keys.create({ data: { secret: this.makeSecret(), ... } });
return { apiKey, error: null };
```
Nach der Erstellung wird das Secret im Klartext zurückgegeben. Das ist notwendig (Einmal-Anzeige), aber sicherstellen, dass:
1. Der Response nicht geloggt wird
2. Der Client das Secret sicher speichert
3. Das Secret nicht in Error-Messages auftaucht

### [LOW] models/apiKeys.js:21 — Error-Message könnte Secret enthalten

```js
consoleLogger.error("FAILED TO CREATE API KEY.", error.message);
```
Prisma-Error-Messages könnten in Edge-Cases den Input enthalten. Sicherstellen, dass `error.message` nicht das generierte Secret enthält.

**Vorgeschlagener Fix:** `consoleLogger.error("FAILED TO CREATE API KEY.", error.message.replace(/secret.*$/i, "[REDACTED]"))` oder generell Error-Messages sanitizen.

---

## 7. Frontend Loading — Image Komprimierung

### [HIGH] frontend/public/favicon-source.png — 1.2 MB unkomprimiert

`favicon-source.png` ist **1.210.388 Bytes (1.2 MB)**. Das ist eine Source-Datei, die nicht ausgeliefert werden sollte. Wenn sie öffentlich zugänglich ist, verschwendet sie Bandbreite.

**Vorgeschlagener Fix:** Aus `public/` entfernen oder in ein Build-Asset umwandeln, das nicht ausgeliefert wird.

### [MEDIUM] frontend/public/ — Keine modernen Bildformate (WebP/AVIF)

Alle Bilder sind PNG:
- `favicon.png` — 47 KB
- `wordmark.png` — 47 KB
- `apple-touch-icon.png` — 11 KB

Keine WebP- oder AVIF-Formate werden verwendet. WebP wäre ~30-50% kleiner bei gleicher Qualität.

**Vorgeschlagener Fix:** Bilder nach WebP konvertieren und `<picture>`-Tags mit Fallback nutzen.

### [MEDIUM] vite.config.js — Kein Image-Optimization-Plugin

Die Vite-Konfiguration enthält kein `vite-plugin-imagemin` oder ähnliches. Bilder werden unverarbeitet ausgeliefert.

**Vorgeschlagener Fix:** `vite-plugin-imagemin` hinzufügen:
```js
import { viteSingleFile } from 'vite-plugin-imagemin';
// oder imagemin in build pipeline
```

### [INFO] frontend/src/ und frontend/assets/ — Keine Bilder gefunden

Im `src/`- und `assets/`-Verzeichnis wurden keine Bilddateien gefunden. Alle Bilder liegen in `public/` und werden unverarbeitet ausgeliefert.

---

## Zusammenfassung

| Severity | Count | Kategorien |
|----------|-------|------------|
| HIGH     | 4     | N+1 Queries (3), Fehlendes Auth-Rate-Limit (1), Unkomprimiertes Bild (1) |
| MEDIUM   | 4     | CSP upgrade-insecure-requests, Redis-Rate-Limit, Sequentielles Embedding, Keine WebP |
| LOW      | 5     | object-src, X-XSS-Protection, chunkSizeWarningLimit, API-Key Error-Messages, OpenAI Rate-Limit |
| INFO     | 7     | Positive Befunde / Best Practices |

### Top 3 Prioritäten:
1. **Rate-Limiting auf Auth-Endpoints** (HIGH — Brute-Force-Schutz)
2. **N+1 Query in `documents.js` und `invite.js`** (HIGH — Performance)
3. **`favicon-source.png` aus `public/` entfernen** (HIGH — 1.2 MB Bandbreite)
