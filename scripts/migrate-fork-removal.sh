#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# migrate-fork-removal.sh
# -----------------------
# Automated migration script for removing fork/upstream references from main docs.
# Based on PR #572 of OpenSIN-AI/OpenSIN-Chat (commit 12c51b3).
#
# Usage:
#   bash scripts/migrate-fork-removal.sh [--dry-run] [--brand NAME]
#
# Options:
#   --dry-run    Show what would change without modifying files
#   --brand NAME Override brand name (default: detect from package.json)
#
# This script is safe to run multiple times (idempotent).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

DRY_RUN=false
BRAND_OVERRIDE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --brand)
      BRAND_OVERRIDE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# ─── Detect brand name ────────────────────────────────────────────────────────
if [[ -n "$BRAND_OVERRIDE" ]]; then
  BRAND="$BRAND_OVERRIDE"
elif [[ -f "package.json" ]]; then
  BRAND=$(grep -oP '"name":\s*"\K[^"]+' package.json | head -1 || echo "unknown")
else
  BRAND="unknown"
fi

echo "→ Detected brand: $BRAND"
echo "→ Dry run: $DRY_RUN"
echo ""

# ─── Helper functions ─────────────────────────────────────────────────────────
log_change() {
  echo "  ✓ $1"
}

check_string() {
  local file="$1"
  local pattern="$2"
  if grep -q "$pattern" "$file" 2>/dev/null; then
    return 0  # found (bad)
  else
    return 1  # not found (good)
  fi
}

# ─── Step 1: Create CREDITS.md ────────────────────────────────────────────────
echo "Step 1: Create CREDITS.md"

if [[ -f "CREDITS.md" ]]; then
  echo "  ⊘ CREDITS.md already exists, skipping"
else
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  → Would create CREDITS.md"
  else
    cat > CREDITS.md <<'CREDITS_EOF'
# Credits & Acknowledgments

This page consolidates attributions for open-source work that contributed to this project.
Main project documentation (README, BRANDING, CONTRIBUTING, AGENTS, SECURITY, TERMS) intentionally
does not reference upstream lineage — see this file for the complete picture.

---

## Foundational Acknowledgments

This project is a sovereign, independent product. It draws on architectural concepts and
engineering practices from prior open-source work, which we gratefully acknowledge below.

| Project | License | Usage |
|---------|---------|-------|
| [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) | MIT | Architectural foundation that inspired the full-stack structure (frontend, server, collector, vector-DB layer) |
| [Mintplex Labs](https://github.com/Mintplex-Labs) | MIT | Authors of the foundational open-source work |

We gratefully acknowledge **Timothy Carambat** and the Mintplex team for establishing foundational
patterns and maintaining high standards of open-source engineering.

> *AnythingLLM is a full-stack application that enables you to turn any document, resource, or piece
> of content into context that any LLM can use as reference during chatting. Built and maintained by
> Mintplex Labs Inc.*

**What was originally drawn from AnythingLLM:** the basic full-stack structure (frontend + server +
collector), LLM/embedding/vector DB provider abstraction, and the agent framework concept.

---

## Third-Party NPM Packages

| Package | Purpose | License |
|---------|---------|---------|
| `@mintplex-labs/express-ws` | WebSocket utility for Express | MIT |
| `@mintplex-labs/bree` | Background job scheduling | MIT |
| `@mintplex-labs/piper-tts-web` | Local text-to-speech (Piper) | MIT |

---

## Key Dependencies

| Project | License | Usage |
|---------|---------|-------|
| [React](https://github.com/facebook/react) | MIT | Frontend UI |
| [Vite](https://github.com/vitejs/vite) | MIT | Frontend build tooling |
| [Vitest](https://github.com/vitest-dev/vitest) | MIT | Frontend test runner |
| [Express](https://github.com/expressjs/express) | MIT | Server API framework |
| [Jest](https://github.com/jestjs/jest) | MIT | Server test runner |
| [Prisma](https://github.com/prisma/prisma) | Apache-2.0 | Database ORM |
| [SWR](https://github.com/vercel/swr) | MIT | React data fetching |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | MIT | Utility-first CSS |
| [pdfjs-dist](https://github.com/mozilla/pdf.js) | Apache-2.0 | PDF text extraction |
| [PDFKit](https://github.com/foliojs/pdfkit) | MIT | PDF report generation |

---

## Embedded Models

- **Default Embedder:** `Xenova/all-MiniLM-L6-v2` (Apache 2.0)
- **Speech Recognition:** OpenAI Whisper (MIT)

---

## External Data Sources

| Source | Usage |
|--------|-------|
| [Bundestag Open Data API](https://www.bundestag.de/services/opendata) | Politician data, speeches, votes |
| [Abgeordnetenwatch API](https://www.abgeordnetenwatch.de/) | Constituency, committees, side jobs |
| [SerpAPI](https://serpapi.com/) / DuckDuckGo | Web search in research pipeline |

---

## Provider Integrations

The project supports LLM, embedding, and vector-DB providers via their respective official SDKs and APIs.

These are optional. When configured in `.env`, data will be transmitted to their services.

---

## Browser-Stack

React 19, Vite, TailwindCSS, Phosphor Icons — all MIT/Apache.

---

## Search & API Providers (for Agents)

Google Programmable Search, SearchApi.io, SerpApi, Serper.dev,
Bing Search, Baidu Search, Serply.io, SearXNG, Tavily, Exa, Perplexity Search.

---

This list is not exhaustive. For a full dependency list, see the individual `package.json` files.
CREDITS_EOF
    log_change "Created CREDITS.md"
  fi
fi

# ─── Step 2: Clean README.md ──────────────────────────────────────────────────
echo ""
echo "Step 2: Clean README.md"

if [[ ! -f "README.md" ]]; then
  echo "  ⊘ README.md not found, skipping"
else
  if check_string "README.md" "Originally inspired by AnythingLLM"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  → Would remove 'Originally inspired by AnythingLLM' from README.md"
    else
      # Use perl for multi-line replacement
      perl -i -0pe 's/A sovereign, independent product built by \[OpenSIN-AI\]\(https://github\.com/OpenSIN-AI\) and optimized for the German political sphere\. Originally inspired by AnythingLLM, OpenSIN Chat has evolved into a purpose-built system for political research with specialized agents, politician databases, and compliance features\./A sovereign, independent product built by [OpenSIN-AI](https:\/\/github.com\/OpenSIN-AI) and optimized for the German political sphere. This project is a purpose-built system for political research with specialized agents, politician databases, and compliance features./g' README.md
      log_change "Removed 'Originally inspired by AnythingLLM' from README.md"
    fi
  fi

  if check_string "README.md" "OpenSIN Chat was \*\*inspired by\*\*"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  → Would replace full Credits section in README.md"
    else
      # Replace the entire Credits section with a link to CREDITS.md
      perl -i -0pe 's/## Credits

OpenSIN Chat was \*\*inspired by\*\*.*?A full list of third-party components is in \[THIRD_PARTY\.md\]\(\.\/THIRD_PARTY\.md\)\./## Credits

This project is a sovereign, independent product. For acknowledgments of open-source projects that contributed to this codebase, see [`CREDITS.md`](.\/CREDITS.md)./gs' README.md
      log_change "Replaced Credits section in README.md"
    fi
  fi
fi

# ─── Step 3: Clean BRANDING.md ────────────────────────────────────────────────
echo ""
echo "Step 3: Clean BRANDING.md"

if [[ ! -f "BRANDING.md" ]]; then
  echo "  ⊘ BRANDING.md not found, skipping"
else
  if check_string "BRANDING.md" "While it shares architectural foundations"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  → Would simplify BRANDING.md header"
    else
      perl -i -0pe 's/> \*\*Important:\*\* OpenSIN Chat is a sovereign, independent product by \[OpenSIN-AI\]\(https:\/\/github\.com\/OpenSIN-AI\)\.
> While it shares architectural foundations with earlier work, it is NOT a fork and should not be referred to as such\.
> It is a purpose-built platform for political research, German compliance, and specialized intelligence workflows\./> This project is a sovereign, independent product.

For upstream acknowledgments and third-party component credits, see [`CREDITS.md`](.\/CREDITS.md)./g' BRANDING.md
      log_change "Simplified BRANDING.md header"
    fi
  fi

  if check_string "BRANDING.md" "DB Provider Identifier.*anythingllm-router"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  → Would remove DB Provider Identifier line"
    else
      perl -i -pe 's/^- \*\*DB Provider Identifier:\*\* `anythingllm-router` \(kept for database backward compatibility\)$//g' BRANDING.md
      log_change "Removed DB Provider Identifier from BRANDING.md"
    fi
  fi

  if check_string "BRANDING.md" "Third-party NPM Packages.*@mintplex-labs"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  → Would simplify Third-party NPM Packages line"
    else
      perl -i -pe 's/^- \*\*Third-party NPM Packages:\*\* `@mintplex-labs\/\*` remain unchanged where used$/Third-party NPM Packages: upstream package scopes remain unchanged where used as-is/g' BRANDING.md
      log_change "Simplified Third-party NPM Packages line in BRANDING.md"
    fi
  fi

  if check_string "BRANDING.md" "cdn\.anythingllm\.com"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  → Would remove telemetry blocklist"
    else
      perl -i -0pe 's/Blocked URLs:

- PostHog \/ Mintplex CDN
- `cdn\.anythingllm\.com`
- `hub\.anythingllm\.com`
- `docs\.anythingllm\.com`

Code reviews must verify this compliance\./Code reviews must verify this compliance./g' BRANDING.md
      log_change "Removed telemetry blocklist from BRANDING.md"
    fi
  fi
fi

# ─── Step 4: Clean THIRD_PARTY.md ─────────────────────────────────────────────
echo ""
echo "Step 4: Clean THIRD_PARTY.md"

if [[ ! -f "THIRD_PARTY.md" ]]; then
  echo "  ⊘ THIRD_PARTY.md not found, skipping"
else
  if check_string "THIRD_PARTY.md" "Foundational acknowledgments"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  → Would remove Foundational Acknowledgments section"
    else
      # Remove the entire Foundational Acknowledgments section (header + table + quote)
      perl -i -0pe 's/## Foundational acknowledgments

\| Project \| License \| Usage \|
\|---------\|---------\|-------\|
\| \[AnythingLLM\].*?

These packages are actively maintained by the Mintplex team and we retain their original names to ensure compatibility and proper attribution\.

/## Third-Party NPM Packages

The following packages are used:

/g' THIRD_PARTY.md

      # Also remove the introductory quote block
      perl -i -0pe 's/> It builds on architectural concepts and engineering practices from prior open-source work,
> including \[AnythingLLM\]\(https:\/\/github\.com\/Mintplex-Labs\/anything-llm\) by \[Mintplex Labs Inc\.\]\(https:\/\/github\.com\/Mintplex-Labs\)\.
> We gratefully acknowledge \*\*Timothy Carambat\*\* and the Mintplex team for establishing foundational patterns
> and maintaining high standards of open-source engineering\.

//g' THIRD_PARTY.md

      log_change "Removed Foundational Acknowledgments from THIRD_PARTY.md"
    fi
  fi
fi

# ─── Step 5: Clean CONTRIBUTING.md ────────────────────────────────────────────
echo ""
echo "Step 5: Clean CONTRIBUTING.md"

if [[ ! -f "CONTRIBUTING.md" ]]; then
  echo "  ⊘ CONTRIBUTING.md not found, skipping"
else
  if check_string "CONTRIBUTING.md" "Never.*re-introduce.*AnythingLLM"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  → Would clean Brand Rules section"
    else
      perl -i -pe 's/^- \*\*Never\*\* re-introduce `AnythingLLM` or `Mintplex Labs` strings outside allowed files$/- See [`BRANDING.md`](.\/BRANDING.md) for full guidelines and [`CREDITS.md`](.\/CREDITS.md) for upstream acknowledgments/g' CONTRIBUTING.md
      log_change "Cleaned Brand Rules in CONTRIBUTING.md"
    fi
  fi

  if check_string "CONTRIBUTING.md" "no `AnythingLLM` or"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  → Would clean PR Guidelines"
    else
      perl -i -0pe 's/3\. Run `\.\/scripts\/check-branding\.sh` — it must pass \(no `AnythingLLM` or
   `Mintplex Labs` strings in new code\)\./3. Run `.\/scripts\/check-branding.sh` — it must pass (no upstream brand strings in new code)./g' CONTRIBUTING.md
      log_change "Cleaned PR Guidelines in CONTRIBUTING.md"
    fi
  fi

  if check_string "CONTRIBUTING.md" "independent product inspired by AnythingLLM"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  → Would clean Brand guard section"
    else
      perl -i -0pe 's/OpenSIN-Chat is an independent product inspired by AnythingLLM \(MIT\)\. Nearly 100% of the codebase has been rewritten or replaced\. Never re-introduce `AnythingLLM` or `Mintplex Labs` strings in user-facing code, UI, or docs\. The branding check \(`\.\/scripts\/check-branding\.sh`\) must pass before merge\. See \[`AGENTS.md`\]\(AGENTS\.md\) for the full project rules\./This project is a sovereign, independent product. The branding check (`.\/scripts\/check-branding.sh`) must pass before merge. See [`AGENTS.md`](AGENTS.md) for the full project rules and [`CREDITS.md`](.\/CREDITS.md) for upstream acknowledgments./g' CONTRIBUTING.md
      log_change "Cleaned Brand guard section in CONTRIBUTING.md"
    fi
  fi
fi

# ─── Step 6: Clean AGENTS.md ──────────────────────────────────────────────────
echo ""
echo "Step 6: Clean AGENTS.md"

if [[ ! -f "AGENTS.md" ]]; then
  echo "  ⊘ AGENTS.md not found, skipping"
else
  if check_string "AGENTS.md" "no PostHog, no Mintplex CDN"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  → Would clean Telemetry line"
    else
      perl -i -pe 's/- \*\*Telemetry:\*\* Completely disabled — no PostHog, no Mintplex CDN, no analytics$/- **Telemetry:** Completely disabled — no third-party analytics, no outbound tracking/g' AGENTS.md
      log_change "Cleaned Telemetry line in AGENTS.md"
    fi
  fi

  if check_string "AGENTS.md" "never re-introduce.*AnythingLLM"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  → Would clean Brand guard line"
    else
      perl -i -pe 's/6\. \*\*Brand guard:\*\* never re-introduce `AnythingLLM` or `Mintplex Labs` strings outside allowed files \(see `scripts\/check-branding\.sh`\)\./6. **Brand guard:** follow [`BRANDING.md`](.\/BRANDING.md) and run `scripts\/check-branding.sh` before any PR./g' AGENTS.md
      log_change "Cleaned Brand guard line in AGENTS.md"
    fi
  fi

  if check_string "AGENTS.md" "Original codebase by.*Mintplex Labs"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  → Would clean Credits section"
    else
      perl -i -0pe 's/## Credits

Original codebase by \[Mintplex Labs Inc\.\]\(https:\/\/github\.com\/Mintplex-Labs\) — used under MIT license\./## Credits

This project is a sovereign, independent product. For acknowledgments of open-source projects that contributed to this codebase, see [`CREDITS.md`](.\/CREDITS.md)./g' AGENTS.md
      log_change "Cleaned Credits section in AGENTS.md"
    fi
  fi
fi

# ─── Step 7: Clean SECURITY.md ────────────────────────────────────────────────
echo ""
echo "Step 7: Clean SECURITY.md"

if [[ ! -f "SECURITY.md" ]]; then
  echo "  ⊘ SECURITY.md not found, skipping"
else
  if check_string "SECURITY.md" "no PostHog, no Mintplex CDN"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  → Would clean Telemetry section"
    else
      perl -i -0pe 's/- \*\*Zero telemetry\*\* — no PostHog, no Mintplex CDN, no analytics, no
  tracking of any kind\./- **Zero telemetry** — no third-party analytics, no outbound tracking, no
  tracking of any kind./g' SECURITY.md
      log_change "Cleaned Telemetry section in SECURITY.md"
    fi
  fi
fi

# ─── Step 8: Clean TERMS_SELF_HOSTED.md ───────────────────────────────────────
echo ""
echo "Step 8: Clean TERMS_SELF_HOSTED.md"

if [[ ! -f "TERMS_SELF_HOSTED.md" ]]; then
  echo "  ⊘ TERMS_SELF_HOSTED.md not found, skipping"
else
  if check_string "TERMS_SELF_HOSTED.md" "All upstream telemetry from the AnythingLLM base"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  → Would clean telemetry statement"
    else
      perl -i -pe 's/All upstream telemetry from the AnythingLLM base has been completely removed at the source level\./All outbound telemetry has been completely removed at the source level./g' TERMS_SELF_HOSTED.md
      log_change "Cleaned telemetry statement in TERMS_SELF_HOSTED.md"
    fi
  fi

  if check_string "TERMS_SELF_HOSTED.md" "PostHog, Mintplex Labs"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  → Would clean outbound calls statement"
    else
      perl -i -pe 's/There are no connections to PostHog, Mintplex Labs, or any other third-party analytics provider/There are no connections to any third-party analytics provider/g' TERMS_SELF_HOSTED.md
      log_change "Cleaned outbound calls statement in TERMS_SELF_HOSTED.md"
    fi
  fi
fi

# ─── Step 9: Update CI linter whitelist ───────────────────────────────────────
echo ""
echo "Step 9: Update scripts/check-branding.sh whitelist"

if [[ ! -f "scripts/check-branding.sh" ]]; then
  echo "  ⊘ scripts/check-branding.sh not found, skipping"
else
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  → Would remove main docs from whitelist and add CREDITS.md"
    echo "    (manual edit required — see docs/MIGRATION-FORK-REMOVAL.md)"
  else
    # Remove main docs from whitelist
    for fname in "README.md" "BRANDING.md" "TERMS_SELF_HOSTED.md" "TERMS.md" "AGENTS.md" "CONTRIBUTING.md" "SECURITY.md"; do
      if grep -q "  "$fname"" scripts/check-branding.sh; then
        perl -i -pe "s/^  "$fname"\[^\n]*\n//g" scripts/check-branding.sh
        log_change "Removed $fname from linter whitelist"
      fi
    done

    # Add CREDITS.md to whitelist (after THIRD_PARTY.md entry)
    if ! grep -q "  "CREDITS.md"" scripts/check-branding.sh; then
      perl -i -pe 's/(  "THIRD_PARTY\.md"\s+# canonical credit doc \(merged: acknowledgments \+ NPM packages\)
)/$1  "CREDITS.md"                       # new dedicated home for upstream acknowledgments
/' scripts/check-branding.sh
      log_change "Added CREDITS.md to linter whitelist"
    fi
  fi
fi

# ─── Step 10: Run branding linter ─────────────────────────────────────────────
echo ""
echo "Step 10: Verify with branding linter"

if [[ -f "scripts/check-branding.sh" ]] && [[ "$DRY_RUN" == "false" ]]; then
  if bash scripts/check-branding.sh; then
    echo ""
    echo "✅ Migration complete — branding linter PASSED"
  else
    echo ""
    echo "⚠️  Branding linter FAILED — manual review needed"
    echo "    See docs/MIGRATION-FORK-REMOVAL.md for guidance"
    exit 1
  fi
else
  echo "  ⊘ Skipping linter (dry run or linter not found)"
fi

echo ""
echo "Done."
