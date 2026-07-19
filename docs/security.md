# OpenSIN Chat — Sicherheits-Handbuch

![Einstellungen / Sicherheit](/docs-screenshots/12-settings.png)


> **Zielgruppe:** Betreiber, Admin, DevOps  
> **Scope:** Produktive Self-Hosting-Deployments (Docker, Bare-Metal, OCI-VM)  
> **Stand:** 2026-06-22  
> **Kurzform:** Keine Telemetrie, Daten bleiben lokal, Auth optional, Secrets müssen deployment-spezifisch sein.

---

## 1. Sicherheitsmodell im Überblick

OpenSIN Chat ist als **selbst-gehostete, datenschutz-affine Plattform** konzipiert. Das bedeutet:

- **Keine Telemetrie:** Standardmäßig ist `DISABLE_TELEMETRY=true` gesetzt. Es gibt keine Outbound-Calls an PostHog, Upstream-CDN oder andere Analyse-Dienste.
- **Lokale Datenhaltung:** Dokumente, Vektor-Embeddings, Chat-Verläufe und Datenbanken liegen auf deiner Infrastruktur.
- **Optionale Authentifizierung:** Du entscheidest, ob die Instanz ohne Auth (vertrauenswürdige Umgebung), Single-User-Modus oder Multi-User-Modus mit Passwort läuft.
- **Keine Cloud-Pflicht:** Du kannst ausschließlich lokale LLMs (Ollama, LM Studio) verwenden.

Für Schwachstellen-Meldungen siehe [`SECURITY.md`](https://github.com/OpenSIN-AI/OpenSIN-Chat/blob/main/SECURITY.md) im Repository-Root.

---

## 2. Authentifizierungsmodi

| Modus | Wann verwenden | Risiko |
|---|---|---|
| **No-Auth** | Vertrauenswürdige, isolierte Netzwerke (z. B. lokales Entwickeln) | Jeder im Netzwerk hat Zugriff. |
| **Single-User** | Einzelnutzer, schneller Start | Session-Token wird automatisch vergeben. Token-Leak = voller Zugriff. |
| **Multi-User** | Teams, produktive Umgebungen | Passwort-basierte User/Role-Trennung (Admin, Default). |

**Empfehlung:** Produktive Deployments immer im Multi-User-Modus mit starkem Admin-Passwort betreiben.

---

## 3. Secrets & Schlüssel-Management

Die folgenden Werte müssen **pro Deployment einzeln generiert** werden und dürfen **niemals im Git-Repo, im Frontend-Bundle oder im README** landen:

| Secret | Zweck | Generierung |
|---|---|---|
| `JWT_SECRET` | Signiert Auth-Tokens | `openssl rand -base64 32` |
| `SIG_KEY` | Signiert Anfragen | `openssl rand -base64 32` |
| `SIG_SALT` | Salz für Signatur | `openssl rand -base64 32` |
| `AUTH_TOKEN` | API-Key für externe Aufrufe | `bash scripts/generate-auth-token.sh` |
| `LLM_API_KEY` | Provider-API-Key (z. B. OpenAI, Anthropic) | Vom Provider-Portal kopieren |
| `BUNDESTAG_DIP_API_KEY` | Bundestag-DIP-API | Von Bundestag beantragen |

### 3.1 Rotation

- Bei Verdacht auf Kompromittierung: **sofort rotieren** und Server/Container neu starten.
- Bei Wechsel des Hosting-Standorts: neue Secrets generieren.
- `JWT_SECRET` und `AUTH_TOKEN` werden über `docker/.env` (bzw. `.env`) injiziert.

### 3.2 CI-Schutz

- `ceo-audit.yml` und `secrets-scan.yml` blockieren versehentliche Commits von Secrets.
- `.env` und `.auth-token-production` sind in `.gitignore` eingetragen.

---

## 4. Netzwerk & Tunnel-Sicherheit

Die Produktiv-Umgebung `sinchat.delqhi.com` nutzt einen **Cloudflare Tunnel** (`cloudflared`).

Vorteile:

- **Kein öffentlicher Port** auf dem Host nötig — der Tunnel ist ausgehend.
- Cloudflare terminiert TLS und hält die Zertifikate.
- DNS zeigt auf den Tunnel-Broker, nicht auf die Host-IP.

**Wichtig:**

- `cloudflared` muss mit einem gültigen Tunnel-Credential laufen.
- `server/.env` / `docker/.env` dürfen nicht in Container-Images oder GitHub-Releases gelangen.
- Für SSH-Admin-Zugang empfehlen wir Key-basierten SSH (`~/.ssh/id_ed25519`) und kein Passwort-Login.

---

## 5. Datenschutz (DSGVO-affine Defaults)

- **Keine Datenweitergabe:** Dokumente und Embeddings verbleiben in `server/storage/` (SQLite, Uploads, Vektoren).
- **Keine Audio- oder Bild-Analyse außerhalb lokaler Modelle:** Wenn du Cloud-Provider nutzt, gelten deren DSGVO-Verträge.
- **Audit-Logs:** User-Aktionen und API-Zugriffe werden serverseitig protokolliert.
- **Löschung:** Workspaces und Dokumente können über das UI oder die API gelöscht werden; zugehörige Embeddings werden mit entfernt.

---

## 6. Dokumenten-Sicherheit & RAG-Isolation

- **Workspace-Isolation:** Jedes Dokument ist einem Workspace zugeordnet. Der LLM-Zugriff erfolgt nur auf Embeddings des aktiven Workspace.
- **Datei-Uploads:** Dateien landen in `server/storage/uploads/`. Der Server validiert MIME-Types und Dateigrößen.
- **Externe Links:** Der Research-`ContentExtractor` blockiert private/link-lokale Netzwerke standardmäßig (`RESEARCH_ALLOW_PRIVATE_NETWORKS=false`).
- **Collector:** Der `collector`-Service kann absichtlich interne Hosts erreichen, damit VPC-interne Deployments scrapen können. Das ist dokumentiertes Verhalten und kein Bug.

---

## 7. API-Sicherheit

- **API-Key:** Fast alle `/api/*`-Endpunkte erfordern `Authorization: Bearer <AUTH_TOKEN>` oder eine gültige Session.
- **Rate-Limit:** PDF-Analyse, Research und externe APIs haben konfigurierbare Rate-Limits und Timeouts.
- **Input-Validierung:** Pfad-Traversal, SSRF gegen die App und unerwartete Dateitypen werden abgelehnt.

---

## 8. Checkliste für neue Deployments

- [ ] `JWT_SECRET`, `SIG_KEY`, `SIG_SALT`, `AUTH_TOKEN` neu generiert
- [ ] `.env` Datei erstellt und **nicht** committed
- [ ] Multi-User-Modus aktiviert (falls Team-Zugriff)
- [ ] Cloudflare Tunnel oder Firewall-Regeln korrekt
- [ ] SSH-Key-basierter Zugang, kein Root-Passwort-Login
- [ ] Backup-Ziel für `server/storage/` eingerichtet
- [ ] `DISABLE_TELEMETRY=true` gesetzt (Default)
- [ ] Logs und Audit-Trail aktiviert

---

## 9. Weiterführende Dokumente

- [`SECURITY.md`](https://github.com/OpenSIN-AI/OpenSIN-Chat/blob/main/SECURITY.md) — Schwachstellen melden, Security Policy
- [`docs/INCIDENT-RESPONSE.md`](./INCIDENT-RESPONSE.md) — Wenn der Dienst ausfällt
- [`docs/OPENSIN-CHAT-DEPLOYMENT.md`](./OPENSIN-CHAT-DEPLOYMENT.md) — Produktions-Deployment
- [`docs/DOCKER-DEPLOYMENT.md`](./DOCKER-DEPLOYMENT.md) — Docker-Self-Hosting

---

*Generated: 2026-06-22 | OpenSIN Chat Security Handbook | SPDX-License-Identifier: MIT*
