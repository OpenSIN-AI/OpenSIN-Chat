# Synthesizer

**Purpose:** Hierarchisches Map-Reduce über alle Chunk-Ergebnisse.

## Was diese Datei tut

**Stufe 1..n**: Gruppen von Chunk-Zusammenfassungen werden zu
Zwischenzusammenfassungen verdichtet (rekursiv, bis eine übrig ist).
Gruppengröße: `REDUCE_GROUP_SIZE` (Default 20).

**Finale Stufe**: State-of-the-Art Best-Practices-Report (Markdown) mit:

- Executive Summary
- Methodik
- Kernerkenntnisse
- Best-Practices & Empfehlungen
- Risiken & offene Punkte
- Quellenverweise

JEDE wesentliche Aussage muss mit Seitenverweis (S. N) belegt werden.

**Grounding-Check** (deterministisch, Post-LLM): Absätze ohne
`(S. N)`-Verweis werden gezählt. Falls welche gefunden werden, erhält
der Report einen `Grounding-Hinweis`-Footer mit Deckungsgrad (%).

Rückgabe: `{ report, masterSummary, groundingRatio }`.

## Abhängigkeiten

- `./llm` — `chat()`
- `./config` — `REDUCE_GROUP_SIZE`

## ENV

| ENV                                | Default | Bedeutung                              |
|------------------------------------|---------|----------------------------------------|
| `PDF_ANALYSIS_REDUCE_GROUP_SIZE`   | 20      | Chunk-Summaries pro Reduce-Gruppe      |

## Caveats

- Reduce-Stufen laufen sequential (nicht via AgentPool/AIMD) — bei
  sehr vielen Chunks kann dies dauern, aber die Anzahl der Stufen ist
  logarithmisch (`ceil(chunks / GROUP_SIZE)` Stufen).
- Top-Findings werden auf 200 gekappt (`findings.slice(0, 200)`) im
  finalen Report-Prompt.
- Grounding-Check ignoriert Überschriften (`#`) und Absätze < 120 Zeichen.
- `groundingRatio = 1` wenn keine Absätze vorhanden (leerer Report).
- `reportType` ist optional — Default: "umfassender Best-Practices-Bericht".
