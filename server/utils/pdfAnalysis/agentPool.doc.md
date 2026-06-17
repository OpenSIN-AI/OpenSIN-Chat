# AgentPool

**Purpose:** Synchronisierte Parallelverarbeitung mit adaptiver Parallelität (AIMD).

## Was diese Datei tut

Wellen-Modell: Chunks in Seitenreihenfolge, Wellen laufen parallel,
nach jeder Welle deterministisches Merge + atomarer Checkpoint.

AIMD-Regelung (Additive Increase / Multiplicative Decrease, wie TCP):

- Rate-Limit-/Überlastfehler in einer Welle → Parallelität halbieren
  (min. 1) und kurze Abkühlphase.
- N fehlerfreie Wellen in Folge → Parallelität +1 (bis zum Maximum).
- Das System findet selbstständig den maximalen stabilen Durchsatz
  des jeweiligen LLM-Providers, ohne manuelles Tuning.

Resume-Mechanismus: bereits abgeschlossene Chunks werden aus dem
Checkpoint geladen und übersprungen. Rate-Limit-fehlgeschlagene Chunks
kommen zurück in die Warteschlange und werden mit reduzierter
Parallelität wiederholt.

## Abhängigkeiten

- `fs`, `path` — Dateisystem (Checkpoints)
- `./config` — `CHECKPOINT_DIR`

## ENV

| ENV                                  | Default | Bedeutung                                    |
|--------------------------------------|---------|----------------------------------------------|
| `PDF_ANALYSIS_AIMD_INCREASE_AFTER`   | 3       | Fehlerfreie Wellen vor Additive Increase      |
| `PDF_ANALYSIS_AIMD_COOLDOWN_MS`      | 5000    | Abkühlphase nach Multiplicative Decrease (ms) |

## Caveats

- Checkpoint-Dateien werden atomar geschrieben (`.tmp` + `rename`).
- Rate-Limit-Erkennung prüft auf 429, rate, overloaded, 503, capacity.
- `clearCheckpoint(jobId)` sollte nach Abschluss aufgerufen werden
  (Retention erledigt dies auch automatisch für beendete Jobs).
