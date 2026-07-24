# Upstream Sync Patches — Manifest

Generated: 2026-06-06T10:01:04Z
Upstream HEAD: `cba598edb57f0850a7cc27f6baf824084ab9f17d`
v1.13.0 base:  `9fe6bbfb09c07628784213e9192a19d2f12bb2a7`

Strategy: one `.patch` per upstream commit (per-commit format-patch).
Each patch is relative to its parent commit, so they compose linearly.
Apply with `./apply-patches.sh` which uses `git am --3way`.

## 01-security-hardening  (4 patches)

- `0002d229` — [PATCH 10/23] add windows paths to isWithin (#5685)
- `de531042` — [PATCH 11/23] apply universal sdk timeout (#5721)
- `d01c2a20` — [PATCH 14/23] update security to stop low-effort AI spam CVE reports
- `c3058d44` — [PATCH 16/23] resolve #5593 by removing admin-required consent param

## 02-critical-bugfixes  (5 patches)

- `d81a7847` — [PATCH 03/23] fix provider override in agents (#5716)
- `c0e94148` — [PATCH 04/23] add DISABLE_SWAGGER_DOCS to persistence
- `cc518056` — [PATCH 06/23] fix: avoid double-encoding SearXNG search queries
- `7db6d233` — [PATCH 12/23] fix: support Azure & Dell Pro AI Studio providers in
- `cba598ed` — [PATCH 23/23] fix: strip XML-illegal control characters from

## 03-voice-features  (2 patches)

- `9c6ab7ca` — [PATCH 08/23] feat: add server-side speech-to-text with OpenAI
- `15b79663` — [PATCH 09/23] Kokoro TTS provider (#5679)

## 04-document-handling  (2 patches)

- `cc28024c` — [PATCH 13/23] Turn HTML scraped sites to Markdown for better research
- `43e0d9a4` — [PATCH 20/23] feat: make document sync stale-after interval

## 05-llm-providers  (5 patches)

- `bee22417` — [PATCH 02/23] feat: add Cerebras as an LLM provider (#5699)
- `65086984` — [PATCH 07/23] Kill `default` thread (#5739)
- `272bf201` — [PATCH 15/23] Improve agent summarizer tool (#5719)
- `35b4132f` — [PATCH 17/23] Generic OpenAI improvements (#5746)
- `54b53094` — [PATCH 22/23] disable model router as main LLM so that

## 06-ui-docs  (5 patches)

- `668b2734` — [PATCH 01/23] docs: list all cloud embedding providers (#5701)
- `7c1e55c1` — [PATCH 05/23] docs: fix self-hosted terms wording (#5737)
- `7a04eceb` — [PATCH 18/23] update README
- `2c22e9dc` — [PATCH 19/23] Update Sponsors README
- `63ee6569` — [PATCH 21/23] update toggle style definition

## Apply order

01 → 02 → 03 → 04 → 05 → 06 (cumulative, in chronological order).
