# citationHref

## Purpose
Validate and normalize agent-generated citation URLs before they are rendered
as clickable links in chat markdown. Prevents malformed or hallucinated URLs
(e.g. a made-up hostname concatenated onto a real URL path, or a link label
that disagrees with its destination) from being turned into misleading links.

## Background (T-0041)
Run 12 reproduced a source-integrity defect on OpenAfD live: Deep Research
returned multiple IANA sources but hallucinated `reserved.dreams.direct` and
rendered it as the clickable URL
`https://www.iana.org/domains/reserved/reserved.dreams.direct`. At least one
link label also mismatched its destination.

## API
- `sanitizeCitationHref(rawHref, labelText) -> string | null`
  - Returns a normalized absolute http(s) URL, or `null` when the URL must not
    be rendered as a clickable link.
  - `null` cases: empty/relative/malformed URL, non-http(s) protocol, missing
    or whitespace-containing host, `localhost`, a label that is a hostname but
    disagrees with the destination host, or a path segment shaped like a
    multi-label hostname (hallucinated domain appended to a real path).

## Usage
The chat markdown renderer (`utils/chat/markdown.ts`) calls this in its
`link_open` rule. When it returns `null`, the renderer emits the label as
plain text instead of an `<a>` element, so invalid citations are not converted
into misleading clickable links.

## Edge cases
- Legitimate IANA/RFC URLs keep working: `test-net.xhtml`, `rfc5737.txt` are
  1-2 label path segments and are not treated as hallucinated hostnames.
- Relative in-app links are intentionally not linkified by this helper;
  callers decide how to handle internal navigation separately.
