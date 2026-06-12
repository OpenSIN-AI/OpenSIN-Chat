# CorpusComparator

**Purpose:** Vergleicht die Analyse-Ergebnisse mehrerer Dokumente und erzeugt den konsolidierten Korpus-Report.

## Was diese Datei tut

Zwei Stufen:

1. **Konfliktanalyse** (LLM, JSON-Output): Übereinstimmungen, Widersprüche,
   Alleinstellungen zwischen den Dokumenten. Bei vielen Dokumenten in
   Batches aufgeteilt.
2. **Konsolidierter Report** (LLM, Markdown): Executive Summary, Dokument-
   übersicht, Übereinstimmungen, Widersprüche, dokumentspezifische Befunde,
   Best-Practices.

## Abhängigkeiten

- `../llm` — `chat()`, `parseJson()` (kein AIMD, kein Pool)
- `./index` — `asyncPool` (Promise-Semaphor)

## Concurrency-Modell

- **Konfliktanalyse**: ggf. in Batches zu je `COMPARE_BATCH_SIZE` (default 10)
  Dokumenten. Batches laufen mit `asyncPool(COMPARE_BATCH_CONCURRENCY, …)`
  (default 1) — typischerweise sequential, kann auf 2–3 hochgedreht werden.
- **Report-Synthese**: immer sequential, da dieser Prompt alle Dokumente
  + das gesamte Vergleichs-JSON enthält.

## Schutzzäune

- `MAX_FINDINGS_PER_DOC` (default 60) — Findings pro Dokument werden gekappt.
- `MAX_CONFLICT_PROMPT_CHARS` (default 200 000) — Batches, deren Prompt
  diesen Cap überschreiten würden, werden übersprungen (leerer Beitrag).
- `try/catch` um `chat()`: ein fehlgeschlagener Batch kippt NICHT den
  Korpus-Report — Report entsteht dann aus den Master-Summaries.

## ENV

| ENV                                              | Default  | Bedeutung                              |
|--------------------------------------------------|----------|----------------------------------------|
| `PDF_ANALYSIS_CORPUS_FINDINGS_PER_DOC`           | 60       | Top-Findings pro Dokument im Konflikt  |
| `PDF_ANALYSIS_CORPUS_MAX_CONFLICT_CHARS`         | 200 000  | Max. Prompt-Größe pro Batch (Zeichen) |
| `PDF_ANALYSIS_CORPUS_BATCH_SIZE`                 | 10       | Dokumente pro Konflikt-Batch          |
| `PDF_ANALYSIS_CORPUS_BATCH_CONCURRENCY`          | 1        | Parallele Konflikt-Batch-Calls         |

## Caveats

- Konflikt-Calls laufen **nicht** durch `agentPool`/`AIMD` — bei 429/503
  muss `llm.js` selbst retry/backoff machen. Aktuell: einfacher Try/Catch,
  Batch-Beitrag wird leer. Für produktive Korpus-Pipelines mit restriktivem
  LLM-Endpoint ggf. `COMPARE_BATCH_CONCURRENCY=1` halten.
- Der finale Report-Prompt kann bei großen Korpora trotzdem groß werden
  (alle Summaries + JSON-Vergleich). Kein Char-Cap dort — bewusst, weil
  der Report sonst unvollständig würde.
