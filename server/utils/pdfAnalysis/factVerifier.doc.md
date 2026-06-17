# FactVerifier

**Purpose:** Prüft LLM-extrahierte Fakten deterministisch gegen echten Seitentext (kein LLM, kein Hallucinationsrisiko).

## Was diese Datei tut

Vorgehen pro Fakt:

1. **Normalisierung**: Zitat und Seitentext werden normalisiert
   (Whitespace, Anführungszeichen, Ligaturen fi/fl, Soft-Hyphen,
   Silbentrennung am Zeilenumbruch).
2. **Exakte Substring-Suche** auf der angegebenen Seite.
3. **Nachbarseiten-Prüfung** ±`VERIFY_PAGE_WINDOW`: bei Treffer auf
   einer Nachbarseite wird die Seitenangabe automatisch korrigiert
   (Agent kann an Chunk-/Seitengrenzen um eine Seite danebenliegen).
4. **Ergebnis**: `{ verified, correctedPage }` — unverifizierte Fakten
   werden je nach STRICT-Modus verworfen oder mit `verified: false`
   gespeichert.

Seitentext wird über einen `Map`-Cache gehalten — jede Seite wird
höchstens einmal aus dem PDF gelesen, auch wenn viele Fakten auf
derselben Seite verifiziert werden.

## Abhängigkeiten

- Keine externen — rein deterministisch, kein LLM-Call.

## ENV

| ENV                             | Default  | Bedeutung                                           |
|---------------------------------|----------|-----------------------------------------------------|
| `PDF_ANALYSIS_VERIFY_WINDOW`    | 1        | Nachbarseiten-Toleranz (±N Seiten)                   |
| `PDF_ANALYSIS_VERIFY_STRICT`    | `false`  | `true` = unverifizierte Fakten verwerfen             |

## Caveats

- `MIN_QUOTE_LENGTH = 12` — zu kurze Zitate sind nicht beweiskräftig
  und werden automatisch als `verified: false` markiert (hardcoded).
- Normalisierung entfernt Silbentrennung: `(\w)-\s*\n\s*(\w)` → `$1$2`.
- Im STRICT-Modus werden Fakten ohne erfolgreiches Zitat-Matching
  komplett entfernt (nicht gespeichert). Im Nicht-Strict-Modus werden
  sie mit `verified: false` und ggf. korrigierter Seitenangabe gespeichert.
- `pageCorrected: true` signalisiert, dass die Original-Seitenangabe
  des LLM korrigiert wurde.
