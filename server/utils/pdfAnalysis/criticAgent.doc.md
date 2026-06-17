# CriticAgent

**Purpose:** Zweite, unabhängige Prüfinstanz (Multi-Agent-Reflexion).

## Was diese Datei tut

Zwei-Stufen-Prüfung der Chunk-Ergebnisse des AnalysisAgent:

**Stufe 1** (deterministisch, kostenlos):

- Leere Summary trotz vorhandenem Seitentext (> 200 Zeichen).
- Findings ohne Seitenangaben (`pages`-Array leer/fehlt).
- Auffällig kurze Summary (< 0.4 % der Quelltext-Länge).

**Stufe 2** (LLM-Critic, nur für Verdachtsfälle):

- Separater Critic mit eigener Persona prüft Qualitätsurteil.
- Bei `quality: "insufficient"` → genau EIN Repair-Versuch durch
  erneute Analyse des Chunks mit Critic-Feedback im Prompt.
- Bei `quality: "sufficient"` → Chunk wird markiert, aber nicht repariert.
- Fehlgeschlagener Repair → Original-Ergebnis bleibt, Critic-Fehler
  wird im `critic`-Feld dokumentiert.

Forschungshintergrund: Selbstkritik desselben Agenten leidet unter
Confirmation Bias — ein SEPARATER Critic ist deutlich wirksamer.

## Abhängigkeiten

- `./llm` — `chat()`, `parseJson()`
- `./analysisAgent` — `analyzeChunk()` (für Repair-Pass)
- `./config` (transitiv via analysisAgent)

## ENV

| ENV                        | Default | Bedeutung                              |
|----------------------------|---------|----------------------------------------|
| `PDF_ANALYSIS_CRITIC`      | `true`  | Critic aktivieren/deaktivieren         |

## Caveats

- `MIN_SUMMARY_RATIO = 0.004` ist hardcoded (Summary-Zeichen pro Input-Zeichen).
- Critic-Prompt erhält max. 16000 Zeichen Quelltext (Slice).
- Ergebnisse sind angereichert um `critic: { flagged, repaired, issues }`.
- Wenn der Critic selbst fehlschlägt (nicht parsebare Antwort), wird
  konservativ repariert (Fallback auf deterministische Flags).
