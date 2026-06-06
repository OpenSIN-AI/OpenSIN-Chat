#!/usr/bin/env bash
# OpenAfD Chat — Branding Linter
# Fails CI when AnythingLLM / Mintplex Labs brand strings appear outside the
# whitelist of files that LEGITIMATELY credit the upstream project.
#
# Docs: scripts/check-branding.doc.md
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# ── Whitelist ───────────────────────────────────────────────────────
# Files where "AnythingLLM" / "Mintplex" mentions are INTENTIONAL.
# Everything else in the repo must not contain these strings.
# Add a comment next to each entry explaining WHY the exception exists.
ALLOWED_FILES=(
  # ── Intentional upstream credit ───────────────────────────
  "THIRD-PARTY.md"                     # canonical credit doc
  "BRANDING.md"                        # branding policy references upstream
  "README.md"                          # "Stand auf Schultern von Riesen" section
  "PROJECT_SUMMARY.md"                 # project meta-doc
  "TERMS_SELF_HOSTED.md"               # §2 references AnythingLLM telemetry
  "TERMS.md"                           # generic terms

  # ── License / package metadata ───────────────────────────
  "LICENSE"
  "LICENSE.md"
  "package.json"                       # contributors[] credits Mintplex Labs
  "server/package.json"                # upstream npm-scope deps: @mintplex-labs/{bree,express-ws,mdpdf} — these are mintplex-published packages we depend on as-is (no upstream rebrand)
  "server/index.js"                    # require('@mintplex-labs/express-ws') — upstream WebSocket layer
  "server/utils/boot/index.js"         # require('@mintplex-labs/express-ws') — SSL WebSocket boot
  "server/utils/BackgroundWorkers/index.js"   # require('@mintplex-labs/bree') + JSDoc @openafd/bree type ref — upstream scheduler
  "server/utils/agents/aibitat/example/websocket/websock-multi-turn-chat.js"  # require('@mintplex-labs/express-ws') — example
  "server/utils/agents/aibitat/example/websocket/websock-branding-collab.js"   # require('@mintplex-labs/express-ws') — example
  "server/utils/agents/aibitat/plugins/create-files/pdf/create-pdf-file.js"    # import('@mintplex-labs/mdpdf') — upstream PDF converter

  # ── Self-reference (linter mentions the strings it forbids) ─
  "scripts/check-branding.sh"
  "scripts/check-branding.doc.md"

  # ── Functional backward-compat: AnythingLLM env vars preserved
  #    so existing user .env files / docker setups keep working.
  "server/utils/helpers/updateENV.js"  # known-env-var whitelist
  "server/utils/boot/patchSdkTimeouts.js"  # reads ANYTHINGLLM_FETCH_TIMEOUT / ANYTHINGLLM_MAX_RETRIES
  "server/utils/collectorApi/index.js"  # reads ANYTHINGLLM_CHROMIUM_ARGS

  # ── Functional backward-compat: logo file shim
  #    server must accept the legacy "anythingllm-logo.png" filename
  #    so existing AnythingLLM installs upgrading to OpenAfD-Chat
  #    do not show a broken image.
  "server/utils/files/logo.js"         # legacy logo filename shim

  # ── Operational docs (Docker setup instructions) ─────────
  "server/storage/README.md"           # docker exec commands reference upstream image

  # ── Vendored third-party embed widget ───────────────────
  #    frontend/public/embed/ holds the public chat-embed script that
  #    other sites copy <script src=".../embed/anythingllm-chat-widget.min.js">.
  #    The filename + minified body legitimately contain "AnythingLLM" —
  #    renaming the asset would break every existing embed on the web.
  "frontend/public/embed/anythingllm-chat-widget.min.js"

  # ── Upstream-sync tooling ───────────────────────────────
  #    docs/UPSTREAM-SYNC.md + scripts/upstream-sync/* explain and execute
  #    the snapshot-sync from Mintplex-Labs/anything-llm. They legitimately
  #    reference upstream names + URLs + the raw patch files (which are
  #    verbatim from upstream and need to remain intact for `git am`).
  "docs/UPSTREAM-SYNC.md"
  "scripts/upstream-sync/"
)

# Build ripgrep exclude-from-file
EXCLUDE_FILE="$(mktemp -t openafd-branding-XXXXXX)"
trap 'rm -f "$EXCLUDE_FILE"' EXIT
{
  for f in "${ALLOWED_FILES[@]}"; do
    if [[ "$f" == */ ]]; then
      # Directory wildcard — exclude everything under it
      echo "!^${f}.*"
    else
      echo "!^${f}\$"
    fi
  done
  # Standard excludes
  echo "!^\\.git/"
  echo "!^node_modules/"
  echo "!^frontend/node_modules/"
  echo "!^server/node_modules/"
  echo "!^collector/node_modules/"
  echo "!^storage/"
  echo "!^dist/"
  echo "!^build/"
  echo "!^coverage/"
  echo "!"*".lock\$"             # package-lock, yarn.lock
  echo "!"*".log\$"
  echo "!"*"-lock\\.yaml\$"      # pnpm-lock.yaml
  echo "!"*"-lock\\.json\$"
  # Brand strings that are EXPECTED in code (deliberate escape hatch)
  echo "!^server/models/communityHub\\.js\$"   # importPrefix "allm-community-id"
  echo "!^server/models/workspace\\.js\$"      # provider "anythingllm-router"
} > "$EXCLUDE_FILE"

# ── Search patterns ─────────────────────────────────────────────────
# What we forbid in non-whitelisted files:
#  - "AnythingLLM" / "anythingllm"   (display name, lower-case identifier)
#  - "Mintplex Labs" / "MintplexLabs" / "mintplex"
#  - "cdn.anythingllm.com" / "hub.anythingllm.com" / "docs.anythingllm.com"
#  - "team@mintplexlabs.com" / "@mintplexlabs"
PATTERNS=(
  "AnythingLLM"
  "anythingllm"
  "Mintplex"
  "mintplex"
  "cdn\.anythingllm\.com"
  "hub\.anythingllm\.com"
  "docs\.anythingllm\.com"
  "mintplexlabs\.com"
  "team@mintplex"
)

# ── Run ─────────────────────────────────────────────────────────────
# Build the allow-list regex dynamically from ALLOWED_FILES.
# This guarantees the filter stays in sync with the whitelist above.
# Directory wildcards (entries ending in `/`) match everything under that dir.
allow_re_pretty='^(\./)?('
allow_re_pretty_alt=()
for f in "${ALLOWED_FILES[@]}"; do
  # Escape regex metachars in filename
  esc=$(printf '%s' "$f" | sed 's/\./\\./g')
  if [[ "$f" == */ ]]; then
    # Directory entry — match the dir and everything under it
    allow_re_pretty_alt+=("${esc}.*")
  else
    allow_re_pretty_alt+=("$esc")
  fi
done
allow_re_pretty+=$(IFS='|'; echo "${allow_re_pretty_alt[*]}")
allow_re_pretty+='):'

violations=0
for pattern in "${PATTERNS[@]}"; do
  echo "── pattern: ${pattern} ──"
  # shellcheck disable=SC2086
  hits=$(rg -n -i --no-heading \
      --glob '!{.git,node_modules,frontend/node_modules,server/node_modules,collector/node_modules,storage,dist,build,coverage}/**' \
      --glob '!**/*.lock' \
      --glob '!**/*.log' \
      --glob '!**/*-lock.yaml' \
      --glob '!**/*-lock.json' \
      "$pattern" . 2>/dev/null \
    | rg -v "scripts/check-branding" \
    | rg -v "$allow_re_pretty" || true)

  if [ -n "$hits" ]; then
    echo "$hits"
    violations=$((violations + 1))
  fi
done

echo ""
if [ "$violations" -gt 0 ]; then
  echo "❌ Branding linter FAILED — $violations pattern(s) found in non-whitelisted files."
  echo ""
  echo "OpenAfD-Chat branding policy:"
  echo "  - 'AnythingLLM' / 'Mintplex' may only appear in:"
  for f in "${ALLOWED_FILES[@]}"; do
    echo "    • $f"
  done
  echo "  - Any new mention must be added to THIRD-PARTY.md (not the code)."
  echo ""
  echo "If a mention is GENUINELY required in code, add the file to ALLOWED_FILES"
  echo "in scripts/check-branding.sh AND add a comment explaining why."
  exit 1
fi

echo "✅ Branding linter PASSED — no AnythingLLM / Mintplex strings outside the whitelist."
