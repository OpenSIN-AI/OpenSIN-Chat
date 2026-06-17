# LLM

**Purpose:** Dünner Wrapper um den OpenSIN LLM-Provider-Layer mit Retry/Backoff.

## Was diese Datei tut

Retry mit exponentiellem Backoff + Jitter für transiente Fehler
(429, rate-limit, timeout, ECONNRESET, socket, overloaded, 503, 502, 500).

Bei `AGENT_CONCURRENCY` parallelen Agenten sind transiente Fehler
erwartbar — ein Chunk darf deshalb nicht sofort als fehlgeschlagen
gelten.

Backoff-Strategie: `BASE_DELAY_MS * 2^attempt * (0.75 + random * 0.5)`
→ z.B. 2s, 4s, 8s, 16s mit ±25 % Jitter.

`parseJson(text)` extrahiert das erste JSON-Objekt aus einer LLM-Antwort
— robust gegen Markdown-Fences (` ```json `) und Vor-/Nachtext.

## Abhängigkeiten

- `../helpers` — `getLLMProvider()` (Provider-Layer des Forks)
- `./config` — `LLM_TEMPERATURE` (Default 0)

## ENV

| ENV                            | Default | Bedeutung                                    |
|--------------------------------|---------|----------------------------------------------|
| `PDF_ANALYSIS_LLM_RETRIES`     | 4       | Max. Retry-Versuche bei transienten Fehlern   |
| `PDF_ANALYSIS_LLM_BACKOFF_MS`  | 2000    | Basis-Verzögerung für exponentiellen Backoff  |

## Caveats

- Nicht-retryable Fehler (z.B. 400 Bad Request, Auth-Fehler) brechen
  sofort ab — nur `isRetryable()` zutreffende Fehler triggern Backoff.
- `chat()` versucht den Ergebnis-Wert aus mehreren Formaten zu extrahieren:
  `string` direkt, `result.textResponse`, sonst `String(result)`.
- `null`/`undefined` vom Provider wirft `Error("LLM lieferte keine Antwort.")`.
- `parseJson` wirft `Error("Kein JSON in LLM-Antwort gefunden.")` wenn
  keine `{`/`}`-Klammern gefunden werden.
