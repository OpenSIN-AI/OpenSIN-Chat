# AnalysisAgent

**Purpose:** Analysiert genau einen Seiten-Chunk eines PDF-Dokuments.

## Was diese Datei tut

Liefert pro Chunk:

- **summary**: dichte Zusammenfassung mit Seitenangaben (S. N-Verweise).
- **findings**: zentrale Erkenntnisse, jeweils mit Seitenbezug (`pages`-Array).
- **facts**: Kandidaten für den Fakten-Speicher — präzise Einzelinformation
  mit wörtlichem Kurz-Zitat, Seitenangabe, Tags und Confidence-Score.

Der System-Prompt instruiert den Agenten, sich AUSSCHLIESSLICH auf den
gegebenen Text zu beziehen, nichts zu erfinden und jede Aussage mit
exakter Seitenangabe zu belegen. Die Antwort muss validem JSON entsprechen.

Bei nicht parsebarer LLM-Antwort: Fallback auf reine Zusammenfassung
(Antwort als `summary`, leere `findings`/`facts`) — der Job wird nicht
abgebrochen.

## Abhängigkeiten

- `./llm` — `chat()`, `parseJson()`
- `./config` — `MAX_CHARS_PER_CHUNK` (Truncation-Limit pro Chunk)

## Caveats

- Input-Text wird auf `MAX_CHARS_PER_CHUNK` Zeichen gekappt (Default 24000).
- `factCriteria` (optional) filtert, welche Fakten aufgenommen werden.
- Confidence-Wert wird defensiv auf `0` gesetzt, wenn nicht numerisch.
