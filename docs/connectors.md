<!-- SPDX-License-Identifier: MIT -->
# Connectors — Browser-Login für externe Services

> Feature: Admin → Agents → Connectors (oder Connector-Katalog-Seite)

## Übersicht

Connectors erlauben Agenten, auf deine externen Accounts zuzugreifen — ohne manuelle API-Keys. Du klickst "Verbinden", ein Browser-OAuth-Popup öffnet sich, und das Token wird verschlüsselt gespeichert.

### Verfügbare Connectors

| Connector | Provider | Status |
|---|---|---|
| Gmail | Google | ✅ Aktiv (mit OAuth-Config) |
| Google Drive | Google | ✅ Aktiv |
| Google Docs | Google | ✅ Aktiv |
| Google Sheets | Google | ✅ Aktiv |
| GitHub Repos | GitHub | ✅ Aktiv |
| Slack | — | 🔒 Coming Soon |
| Notion | — | 🔒 Coming Soon |
| Linear | — | 🔒 Coming Soon |
| Jira | — | 🔒 Coming Soon |
| HubSpot | — | 🔒 Coming Soon |
| Google Calendar | Google | 🔒 Coming Soon |

## Einrichtung

### Google OAuth-App (für Gmail, Drive, Docs, Sheets)

1. Gehe zu [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Erstelle eine OAuth 2.0 Client ID (Web Application)
3. Authorized Redirect URI: `https://sinchat.delqhi.com/api/connectors/google/callback`
4. Aktiviere Scopes: Gmail, Drive, Docs, Sheets (in OAuth Consent Screen)
5. Trage in `.env` ein:
```env
GOOGLE_OAUTH_CLIENT_ID=deine_client_id
GOOGLE_OAUTH_CLIENT_SECRET=dein_client_secret
SERVER_PUBLIC_URL=https://sinchat.delqhi.com
```

### GitHub OAuth-App

1. Gehe zu [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Erstelle eine OAuth App
3. Callback URL: `https://sinchat.delqhi.com/api/connectors/github/callback`
4. Trage in `.env` ein:
```env
GITHUB_OAUTH_CLIENT_ID=deine_client_id
GITHUB_OAUTH_CLIENT_SECRET=dein_client_secret
```

### Ohne OAuth-Config

OpenSIN-Chat läuft **produktionsreif ohne OAuth-Config**:
- Connector-Katalog zeigt "Coming Soon" Badges
- Bestehende manuelle API-Key-Eingabe (z.B. in GMailSkillPanel) bleibt funktionieren
- Keine Crashes, keine 500-Errors

## Verwendung

### Connector verbinden
1. Gehe zu **Admin → Agents → Connectors**
2. Klicke auf das Tile des gewünschten Services
3. Klicke "Verbinden"
4. OAuth-Popup öffnet sich → Login → Berechtigung erteilen
5. Popup schließt sich → Tile zeigt "✅ Verbunden als dein@email.com"

### Connector trennen
1. Klicke "Trennen" auf dem verbundenen Tile
2. Token wird bei Provider widerrufen + aus DB gelöscht

### In Agent-Skills nutzen
Sobald ein Connector verbunden ist, können Agenten ihn automatisch nutzen:
- Gmail-Agent liest E-Mails über OAuth-Token (statt manuellem API-Key)
- GitHub-Tools greifen auf Repos zu
- Drive/Docs/Sheets-Tools lesen/schreiben Dateien

## Sicherheit

| Maßnahme | Implementierung |
|---|---|
| PKCE (S256) | ✅ Verhindert Code-Interception |
| State-Parameter | ✅ CSRF-Schutz (10min TTL, one-time use) |
| Token-Verschlüsselung | ✅ AES-256-GCM at-rest (EncryptionManager) |
| Token im Frontend | ❌ Nie — `listSafe()` gibt keine Blobs zurück |
| Auto-Refresh | ✅ Proaktiv vor Ablauf, coalesced (kein Thundering Herd) |
| Refresh-Fehler | ✅ `requires_reauth` Flag (kein stilles Löschen) |
| Per-User-Tokens | ✅ Multi-User-Mode unterstützt |

## API

```
GET  /api/connectors                              — Liste + Verfügbarkeit
GET  /api/connectors/:provider/start?product=X    — OAuth-Flow starten
GET  /api/connectors/:provider/callback           — OAuth Callback (Popup)
POST /api/connectors/:provider/disconnect         — Token widerrufen
```

## Troubleshooting

**"Coming Soon" statt "Verbinden":** OAuth-Env-Vars nicht gesetzt. Prüfe `.env`.

**Popup öffnet sich nicht:** Browser blockiert Popups. Erlaube Popups für `sinchat.delqhi.com`.

**Token-Refresh schlägt fehl:** Connector zeigt `requires_reauth` — neu verbinden.

**Google-Scopes nicht freigegeben:** Im Google Consent Screen "Testing"-Modus bist du als Test-User eingetragen? Für Produktion: Google-Verification beantragen.
