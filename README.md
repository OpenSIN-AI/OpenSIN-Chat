<div align="center">
  <br />
  <a href="https://openafd.delqhi.com">
    <img src="./images/wordmark.png" alt="OpenAfD Chat — Sovereigner KI-Arbeitsraum" width="380" />
  </a>
  <br />
  <br />

**Sovereäner KI-Arbeitsraum für patriotische Politik**

Chatte mit deinen Dokumenten. Automatisiere Recherche. Multi-User, selbst gehostet, ohne Telemetrie — auf deiner eigenen Infrastruktur.

  <br />

[![Cloudflare-Deployment](https://img.shields.io/badge/Cloudflare-deployed-orange?logo=cloudflare)](https://openafd.delqhi.com)
[![License: MIT](https://img.shields.io/badge/Lizenz-MIT-gr%C3%BCn)](./LICENSE)
[![Repo: GitHub](https://img.shields.io/badge/Repo-GitHub-black?logo=github)](https://github.com/Family-Team-Projects/OpenAfD-Chat)
[![DSGVO-konform](https://img.shields.io/badge/DSGVO-konform-blau)]()
[![Keine Telemetrie](https://img.shields.io/badge/Telemetrie-KOMPLETT%20AUS-rot)]()

  <br />
</div>

---

## 🎯 Was ist OpenAfD Chat?

OpenAfD Chat ist eine **selbstgehostete KI-Plattform** für politische Arbeit, Recherche und Wissensmanagement. Sie wurde auf Basis von [OpenAfD Chat](https://github.com/Family-Team-Projects/openafd-chat) (MIT) als souveräne, markenfreie Variante für den deutschsprachigen politischen Raum weiterentwickelt.

**Im Kern:** Du lädst deine Dokumente hoch (Bundestags-Drucksachen, Pressemitteilungen, Gesetzesentwürfe, interne Papiere) — und die KI beantwortet Fragen **nur aus diesen Quellen**, mit nachvollziehbaren Zitaten. Keine Halluzinationen aus dem Nichts, keine Cloud-Pflicht, keine Telemetrie.

## ✨ Features

- 📚 **Dokumente chatten** — PDF, DOCX, TXT, Markdown, Webseiten, YouTube-Transkripte
- 🧠 **Vektor-Datenbanken** — LanceDB, Chroma, Pinecone, Qdrant, Milvus, PGVector …
- 🤖 **LLM-Auswahl** — OpenAI, Anthropic, Mistral, DeepSeek, Ollama (lokal), LM Studio, Lemonade …
- 🛠 **AI-Agenten** — automatisierte Recherche, Web-Browsing, PDF-Erstellung, Code-Ausführung
- 🔌 **MCP-Kompatibilität** — binde beliebige externe Tools ein
- 👥 **Multi-User** — Berechtigungen, Workspaces, Audit-Logs (Docker-Version)
- 🌐 **Mehrsprachig** — Deutsch, Englisch, weitere Sprachen
- 🇩🇪 **AfD-Branding** — blaues Farbschema, eigene Logo-Platzhalter, deutschsprachiger System-Prompt
- 🚫 **Keine Telemetrie** — Null Datenverkehr zu Dritten (kein PostHog, kein CDN-Tracking)

## 🚀 Schnellstart

### Live-Demo

👉 **https://openafd.delqhi.com** (Cloudflare-Deployment)

### Selbst hosten (Docker)

```bash
git clone https://github.com/Family-Team-Projects/OpenAfD-Chat.git
cd OpenAfD-Chat/docker
cp .env.example .env
docker compose up -d
```

Dann `http://localhost:3001` öffnen.

### Bare-Metal / Development

Siehe [`BARE_METAL.md`](./BARE_METAL.md) und [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md).

## 🏗 Architektur

```
OpenAfD-Chat/
├── frontend/      # Vite + React (UI)
├── server/        # Node.js Express (API, Vektor-DB, Auth)
├── collector/     # Node.js Express (Document-Parsing, OCR)
├── docker/        # Dockerfiles, docker-compose
├── cloud-deployments/   # AWS, GCP, Azure, K8s, Helm
└── docs/          # Doku
```

## 🔒 Sicherheit & Datenschutz

- **Null Telemetrie** — `DISABLE_TELEMETRY=true` ist der Default; keine Outbound-Calls zu PostHog, OpenAfD Team-CDN oder Drittanbietern
- **DSGVO-affin** — alle Daten bleiben auf deiner Infrastruktur
- **Keine externen LLM-Pflichten** — du kannst komplett offline mit Ollama oder LM Studio arbeiten
- **Selbstsignierte JWT-Secrets** — keine Backdoors
- **Audit-Logs** — alle User-Aktionen nachvollziehbar

Mehr in [`SECURITY.md`](./SECURITY.md).

## 🤝 Mitwirken

Beiträge sind willkommen — siehe [`CONTRIBUTING.md`](./CONTRIBUTING.md). Code-Conventions, Branching-Strategie, Commit-Format sind dort beschrieben.

## 📜 Lizenz

**MIT** — siehe [`LICENSE`](./LICENSE). Du kannst das Projekt frei nutzen, verändern und weitergeben, solange der Lizenztext erhalten bleibt.

## 🙏 Danksagung — Upstream-Credit

OpenAfD Chat ist ein Community-Fork von **[AnythingLLM](https://github.com/Mintplex-Labs/anything-llm)**, entwickelt von **[Mintplex Labs Inc.](https://github.com/Mintplex-Labs)** unter MIT-Lizenz.

Ohne die hervorragende Arbeit von **Timothy Carambat** und dem gesamten Mintplex-Team, der AnythingLLM-Community und allen Mitwirkenden wäre dieses Projekt nicht möglich gewesen. Wir stehen auf den Schultern von Riesen — und das soll hier ausdrücklich gewürdigt werden.

> *AnythingLLM is a full-stack application that enables you to turn any document, resource, or piece of content into context that any LLM can use as a reference during chatting. Built and maintained by [Mintplex Labs Inc.](https://github.com/Mintplex-Labs) — used here as the foundation for OpenAfD Chat.*

**Was wir von AnythingLLM übernommen haben:**

- Komplette Architektur (Frontend, Server, Collector, Vector-DB-Layer)
- LLM-, Embedding- und Vektor-Datenbank-Provider-Landschaft
- Agent-Framework, MCP-Integration, Web-Scraping
- Sicherheits-, Auth- und Multi-User-Konzept
- `@mintplex-labs/*` NPM-Pakete (WebSocket, Bree Scheduler, Piper-TTS)

**Was OpenAfD Chat draufsetzt:**

- Komplettes Rebranding (AfD-Blau, deutsche Sprache, eigenes Logo)
- Telemetrie **komplett** entfernt (statt nur abschaltbar)
- DSGVO-affine Defaults (kein Phone-Home, kein CDN-Tracking)
- Branding-Strategie auf einen deutschsprachigen politischen Use-Case
- Mittelfristig: Bundestag-Drucksachen-Connector, Pressemitteilungs-Importer

**Upstream synchronisieren:** Wir empfehlen, das Original-Repo als Git-Remote hinzuzufügen, um Sicherheits-Patches mitzuziehen:

```bash
git remote add upstream https://github.com/Mintplex-Labs/anything-llm.git
git fetch upstream
```

Eine vollständige Liste aller Drittanbieter-Komponenten findest du in [`THIRD-PARTY.md`](./THIRD-PARTY.md).

---

<div align="center">

### 💙 Thank you, Mintplex Labs!

[![Upstream](https://img.shields.io/badge/Upstream-AnythingLLM-009ee0?logo=github)](https://github.com/Mintplex-Labs/anything-llm)
[![Original Repo](https://img.shields.io/badge/Mintplex--Labs-anything--llm-black?logo=github)](https://github.com/Mintplex-Labs/anything-llm)
[![MIT License](https://img.shields.io/badge/License-MIT-green)](https://github.com/Mintplex-Labs/anything-llm/blob/master/LICENSE)
[![Discord (Original)](https://img.shields.io/badge/Discord-Original%20Community-blueviolet?logo=discord)](https://discord.gg/6UyHPeGZAC)

*OpenAfD Chat is a community fork. All credit for the original codebase goes to the Mintplex Labs team and the AnythingLLM contributors.*

</div>

---

---

<div align="center">
  <sub>OpenAfD Chat · Sovereigner KI-Arbeitsraum · Selbst gehostet · Keine Telemetrie</sub>
</div>
