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

## 🙏 Danksagung

OpenAfD Chat baut auf der exzellenten Arbeit von **Family Team Projects** und ihrem Open-Source-Projekt [OpenAfD Chat](https://github.com/Family-Team-Projects/openafd-chat) auf (MIT-Lizenz). Ohne diese Grundlage wäre dieses Projekt nicht möglich. Wir danken der Community und allen Mitwirkenden.

Eine vollständige Liste der Drittanbieter-Komponenten findest du in [`THIRD-PARTY.md`](./THIRD-PARTY.md).

---

<div align="center">
  <sub>OpenAfD Chat · Sovereigner KI-Arbeitsraum · Selbst gehostet · Keine Telemetrie</sub>
</div>
