# AfD-Pressemitteilungs-Importer

Importiert Pressemitteilungen direkt von [afd.de/presse](https://www.afd.de/presse/pressemitteilungen/).

## Eigenschaften

- **Quelloffen** — offizielle AfD-Presse-Seite, öffentlich zugänglich
- **Kein Telemetrie-Outbound** — Direktverbindung, keine Drittanbieter
- **Respektvoller Crawl** — 500 ms Pause zwischen Requests
- **Vollständige Texte** — Titel, Hauptinhalt, Datum, Autor
- **Direkter Import** in einen OpenSIN-Chat-Workspace

## API

```js
const {
  afdPresseLatest,
  afdPresseFromUrl,
} = require("./collector/utils/extensions/AfDPresse");

// 1) Neueste 20 Pressemitteilungen importieren
await afdPresseLatest({ limit: 20 });

// 2) Einzelne Pressemitteilung von URL importieren
await afdPresseFromUrl({
  url: "https://www.afd.de/...",
});
```

## Was wird extrahiert?

Pro Pressemitteilung wird ein Markdown-Dokument erzeugt mit:

- Titel
- URL-Quelle
- Autor (falls erkennbar)
- Veröffentlichungsdatum
- Hauptinhalt (Plain-Text)

## Use-Cases

- **Tagespresse-Sammlung:** „Importiere alle Pressemitteilungen dieser Woche"
  → `afdPresseLatest({ limit: 50 })`
- **Themen-Monitoring:** Tägliche Sync-Jobs via Scheduled Jobs, um neue PMs
  in einen Workspace zu indizieren
- **Zitat-Recherche:** „Hat sich die Fraktion zu Thema X geäußert?" → Workspace
  mit bereits importierten PMs durchsuchen

## Einschränkungen

Der Parser basiert auf der aktuellen WordPress-Theme-Struktur von afd.de.
Sollte die Partei das Theme wechseln, müssen die Regex-Patterns
(`extractPressLinksFromList`, `extractPressArticle`) angepasst werden.
