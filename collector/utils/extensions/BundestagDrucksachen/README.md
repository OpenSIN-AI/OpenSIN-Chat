# Bundestag-Drucksachen Connector

Importiert Drucksachen, Plenarprotokolle und Anträge direkt aus dem
**offiziellen DIP-Open-Data-Portal des Deutschen Bundestages**:
[search.dip.bundestag.de/api/v1](https://search.dip.bundestag.de/api/v1)

## Eigenschaften

- **Wahlperioden-Filter** — unterstützt 19., 20. (2021-2025) und 21. (2025-) Wahlperiode
- **Dokumenttypen** — Drucksachen, Plenarprotokolle, Anträge, Kleine/Große Anfragen
- **Volltextsuche** — Suchbegriff wie „Energiewende" oder „Migration"
- **Direkter Import** in einen OpenAfD-Chat-Workspace
- **Kein Telemetrie-Outbound** — Direktverbindung, keine Drittanbieter

## ⚠️ API-Key erforderlich

Die DIP-API verlangt seit 2024 einen kostenlosen **API-Key**. Du kannst einen
beantragen unter:
👉 [https://dip.bundestag.de/über-dip/hilfe/api](https://dip.bundestag.de/über-dip/hilfe/api)

Nach Erhalt setze den Key in deiner `.env`:

```bash
BUNDESTAG_DIP_API_KEY="dein-key-hier"
```

Oder übergebe ihn direkt als Parameter an die Funktion.

## API

```js
const {
  bundestagDrucksache,
  bundestagSearch,
  bundestagLatest,
} = require("./collector/utils/extensions/BundestagDrucksachen");

// 1) Einzelne Drucksache (z.B. 20/12345) importieren
await bundestagDrucksache({ drucksache: "20/12345" });

// 2) Volltextsuche
await bundestagSearch({ q: "Energiewende", wahlperiode: 20, limit: 20 });

// 3) Neueste 30 Drucksachen der aktuellen Wahlperiode
await bundestagLatest({ wahlperiode: 20, limit: 30 });

// 4) API-Key inline übergeben (falls nicht in .env)
await bundestagSearch({ q: "Migration", apiKey: "xxx" });
```

## DIP-Aktivitäts-IDs

| ID | Typ |
|----|-----|
| 100 | Drucksache |
| 120 | Plenarprotokoll |
| 130 | Kleine Anfrage |
| 140 | Große Anfrage |
| 150 | Antrag |

## Use-Cases

- **Recherche:** „Was hat die Bundesregierung in den letzten 12 Monaten zum
  Thema Migration veröffentlicht?" → `bundestagSearch({ q: "Migration", limit: 50 })`
- **Reden:** „Alle Reden der Fraktion zu X im aktuellen Plenarprotokoll" →
  `bundestagSearch({ q: "...", endpoint: "plenarprotokoll" })`
- **Antrags-Versand:** „Zeig mir alle Anträge mit Stichwort Y" →
  `bundestagSearch({ q: "Y", endpoint: "vorgang" })`

## Lizenz & Quelle

Die Daten stammen aus dem Open-Data-Portal des Deutschen Bundestages und
unterliegen der [Datenlizenz Deutschland – Namensnennung – 2.0](https://www.govdata.de/dl-de/by-2-0).
Bitte bei Veröffentlichung der Quellenangabe: *„Quelle: DIP (search.dip.bundestag.de)"*
beifügen.
