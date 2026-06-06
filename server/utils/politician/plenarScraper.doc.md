# plenarScraper.doc.md

## What

Parser for Bundestag Plenarprotokolle (XML format). Downloads and parses plenary session transcripts to extract individual politician speeches.

## Strategy

1. Fetch plenary protocol index for a session
2. Parse XML (preferred over PDF)
3. Extract `<rede>` blocks per politician
4. Return structured `{speaker, text, date, top}` objects

## API

- `fetchProtocol(session, sitting)` — fetch and parse a single protocol
- `fetchSessionIndex(session)` — get all sittings for a Wahlperiode
- `matchSpeaker(speech, nameMap)` — fuzzy-match speech speaker to politician

## Sources

- XML: `https://dserver.bundestag.de/btp/{WP}/{WP}{NNNNN}.pdf.xml`
- PDF: `https://dserver.bundestag.de/btp/{WP}/{WP}{NNNNN}.pdf`

## Caveats

- XML parsing uses regex (no DOM parser in worker processes)
- Speaker party extraction is limited (requires cross-referencing with politician DB)
- Rate limit: 1000ms between requests (government server)
