# Onboarding deaktivieren / überspringen

Das Onboarding wird über das System-Setting `onboarding_complete` gesteuert. Der
Wert ist ein **String** in der Datenbanktabelle `system_settings`:

| Wert | Bedeutung |
|---|---|
| `"true"` | Onboarding als abgeschlossen markiert → Wizard wird nicht angezeigt |
| `"false"`, leer oder nicht vorhanden | Onboarding aktiv → Wizard wird angezeigt |

## Methoden zum Deaktivieren

### 1. Durch das Onboarding klicken (empfohlen)

Rufe die App auf, folge den Setup-Schritten und klicke dich bis zum Ende durch.
Beim Abschluss sendet das Frontend einen `POST /api/onboarding`-Request. Das
Backend setzt `onboarding_complete` dann automatisch auf `"true"`.

### 2. API-Call

Wenn du einen laufenden Server hast, kannst du das Onboarding auch direkt als
abgeschlossen markieren:

```bash
curl -X POST http://localhost:3001/api/onboarding
```

Der Endpunkt ist öffentlich zugänglich, solange das Setup noch nicht
abgeschlossen ist.

### 3. Direkt in der Datenbank

Für Docker-Deployments, automatisierte Setups oder Support-Fälle kannst du den
Wert direkt in der Datenbank setzen:

```sql
INSERT INTO system_settings (label, value)
VALUES ('onboarding_complete', 'true')
ON CONFLICT (label) DO UPDATE SET value = 'true';
```

> Hinweis: Der genaue Spaltenname und Constraint hängen vom Prisma-Schema ab.
> Prüfe `server/prisma/schema.prisma`, falls das Statement abweicht.

### 4. Dev-Bypass (nur Entwicklung)

Beim lokalen Frontend-Build kannst du das Onboarding im Browser überspringen,
ohne den Server zu verändern:

```js
localStorage.setItem("anythingllm_disable_onboarding", "true");
```

Lade die Seite neu. Dieser Bypass funktioniert **nur in Vite-Dev-Builds** und
wird in Produktions-Builds ignoriert.

Alternativ kannst du das Frontend mit der Umgebungsvariable bauen:

```bash
VITE_DISABLE_ONBOARDING=true npm run dev
```

## Wo der Wert gelesen wird

- **Backend:** `server/models/systemSettings.js` — `isOnboardingComplete()`
- **Frontend:** `frontend/src/models/system.ts` — `isOnboardingComplete()`
- **Boot-Patch:** `server/utils/boot/markOnboarded.js` — markiert alte
  Installationen automatisch als onboarded

## Wichtige Hinweise

- `onboarding_complete` ist ein **geschütztes Feld** (`protectedFields`). Es
  taucht nicht in öffentlichen `/settings`-Responses auf.
- `markOnboardingComplete()` löst ein Telemetry-Event `onboarding_complete` aus.
  Wenn du Telemetry deaktiviert hast, wird das Setting trotzdem gesetzt.
- Setze den Wert nie auf einen anderen String als `"true"` oder `"false"`, da die
  Vergleichslogik im Backend exakt auf `=== "true"` prüft.
