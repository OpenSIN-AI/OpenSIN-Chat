#!/usr/bin/env bash
# OpenSIN Chat — Branding Linter
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
  "THIRD-PARTY.md"                     # canonical credit doc (hyphen variant)
  "THIRD_PARTY.md"                     # canonical credit doc (underscore variant)
  "BRANDING.md"                        # branding policy references upstream
  "README.md"                          # "Stand auf Schultern von Riesen" section
  "TERMS_SELF_HOSTED.md"               # §2 references AnythingLLM telemetry
  "TERMS.md"                           # generic terms
  "docs/changelog-recent.md"           # recent changelog entries referencing upstream
  "docs/abandoned-packages-audit.md"   # audit doc referencing upstream git deps

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
  "frontend/package.json"                # upstream npm-scope dep: @mintplex-labs/piper-tts-web — mintplex-published TTS voice package we depend on as-is

  # ── Upstream npm-scope deps used as-is in code ────────────
  "server/utils/reports/index.js"        # require('@mintplex-labs/mdpdf') — upstream Markdown-to-PDF converter
  "frontend/src/utils/piperTTS/index.js"   # JSDoc type refs to @mintplex-labs/piper-tts-web
  "frontend/src/utils/piperTTS/worker.js"  # import '@mintplex-labs/piper-tts-web' — upstream TTS voice engine
  "frontend/vite.config.js"               # manualChunks regex matches @mintplex-labs/{mdpdf,piper-tts-web} for vendor-splitting

  # ── Module docs that credit the upstream package they wrap ─
  "server/utils/reports/index.doc.md"        # documents @mintplex-labs/mdpdf dependency
  "server/utils/research/webSearchEngine.doc.md"  # credits reused AnythingLLM agent search infra
  "ROADMAP.md"                               # changelog rows reference @mintplex-labs/* package reverts

  # ── CEO audit reports (reference upstream codebase lineage) ─
  "ceo-audits/"                              # audit docs describe the AnythingLLM codebase OpenSIN-Chat is built on

  # ── Self-reference (linter mentions the strings it forbids) ─
  "scripts/check-branding.sh"
  "scripts/check-branding.doc.md"

  # ── Functional backward-compat: AnythingLLM env vars preserved
  #    so existing user .env files / docker setups keep working.
  "server/utils/helpers/updateENV.js"  # known-env-var whitelist (thin shim)
  "server/utils/helpers/updateENV/dumpENV.js"  # known-env-var whitelist (split from updateENV.js)
  "server/utils/boot/patchSdkTimeouts.js"  # reads ANYTHINGLLM_FETCH_TIMEOUT / ANYTHINGLLM_MAX_RETRIES
  "server/utils/collectorApi/index.js"  # reads ANYTHINGLLM_CHROMIUM_ARGS

  # ── Functional backward-compat: logo file shim
  #    server must accept the legacy "anythingllm-logo.png" filename
  #    so existing AnythingLLM installs upgrading to OpenSIN-Chat
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
  #    Newer OpenSIN-branded embed is also a transitional vendored copy of the
  #    upstream widget; its minified body still contains legacy AnythingLLM/
  #    Mintplex strings. Cleaning it is tracked separately; for now it is
  #    treated the same as the legacy asset above.
  "frontend/public/embed/opensin-chat-widget.min.js"

  # ── Upstream-sync tooling ───────────────────────────────
  #    docs/UPSTREAM-SYNC.md + scripts/upstream-sync/* explain and execute
  #    the snapshot-sync from Mintplex-Labs/anything-llm. They legitimately
  #    reference upstream names + URLs + the raw patch files (which are
  #    verbatim from upstream and need to remain intact for `git am`).
  "docs/UPSTREAM-SYNC.md"
  "docs/vercel-deploy-fix.md"        # references upstream as AnythingLLM-Fork
  "docs/architecture.md"             # SSoT production architecture — references AnythingLLM as upstream-fork context
  "scripts/upstream-sync/"

  # ── Server unit tests ──────────────────────────────────
  #    server/__tests__/* mocks upstream npm-scope modules (e.g.
  #    @mintplex-labs/mdpdf) via jest.mock(...) — the test must reference
  #    the real upstream module name to mock it.
  "server/__tests__/"

  # ── Auto-generated SBOM artefacts ──────────────────────
  #    sbom/*.json (CycloneDX 1.5 + SPDX 2.3) enumerate every direct+transitive
  #    dependency including upstream @mintplex-labs/* packages. Package
  #    identity is the ground truth of package.json/yarn.lock — it cannot
  #    be rebranded without breaking the SBOM's purl/dependsOn references.
  "sbom/"

  # ── Env examples — upstream docs links ────────────────
  #    docker/.env.example + server/.env.example reference docs.anythingllm.com
  #    for upstream configuration docs (link is genuine, not brand promotion).
  "docker/.env.example"
  "server/.env.example"

  # ── Helm chart — upstream image reference ──────────────
  #    values.yaml uses mintplexlabs/anythingllm as the OCI image repo
  #    (the Docker image we run IS the upstream anythingllm image).
  #    Chart.yaml mentions "Fork von AnythingLLM" as contextual description.
  "cloud-deployments/helm/charts/opensin-chat/values.yaml"
  "cloud-deployments/helm/charts/opensin-chat/Chart.yaml"

  # ── Dockerfile — upstream asset download ──────────────
  #    Downloads Chromium for ARM from webassets.anythingllm.com (upstream
  #    prebuilt binary). The URL is a factual dependency, not brand promotion.
  "docker/Dockerfile"
  "cloud-deployments/openshift/Dockerfile"   # same upstream Chromium ARM download as docker/Dockerfile

  # ── Architectural decision records ────────────────────
  #    docs/adr/*.md reference the upstream AnythingLLM codebase + issues
  #    to justify architectural decisions (context, not promotion).
  "docs/adr/"

  # ── Rebrand script — upstream mention in comment ──────
  #    scripts/rebrand-opensin.sh comment explains it avoids renaming
  #    AnythingLLM env-vars / functional keys. Intent is functional, not brand.
  "scripts/rebrand-opensin.sh"

  # ── Generated SBOM JSON (bom.json) ──────────────────
  #    CycloneDX 1.7 auto-generated by cdxgen — includes upstream package refs
  #    and pre-rebrand metadata for provenance.
  "bom.json"
  "sbom.spdx.json"
  "sbom.cdx.json"

  # ── WebSocket agent endpoint — mintplex NPM dep ──────
  #    require('@mintplex-labs/express-ws') — upstream WebSocket layer used as-is.
  "server/endpoints/agentWebsocket.js"

  # ── Terminal endpoint — legacy path redaction ──────────
  #    terminalExec.js redacts /var/lib/anythingllm from command output so
  #    that legacy Docker installations upgrading to OpenSIN-Chat don't leak
  #    their host storage path. The path is a backward-compat security redaction.
  "server/endpoints/utils/terminalExec.js"

  # ── Collector package.json — upstream NPM dep ────────
  #    epub2: "git+https://github.com/Mintplex-Labs/epub2-static.git#main"
  #    Upstream EPUB parsing package we use as-is.
  "collector/package.json"

  # ── Piper TTS frontend — upstream NPM dep ────────────
  #    import '@mintplex-labs/piper-tts-web' — upstream TTS voice engine used as-is.
  #    JSDoc type refs to @mintplex-labs/piper-tts-web and @mintplex-labs/piper-web-tts.
  "frontend/src/utils/piperTTS/index.ts"
  "frontend/src/utils/piperTTS/worker.ts"

  # ── server/app.js — mintplex NPM dep ────────────────
  #    require('@mintplex-labs/express-ws') in non-HTTPS, non-test mode.
  "server/app.js"

  # ── Functional backward-compat: localStorage keys ───
  #    Frontend reads legacy "anythingllm_disable_onboarding" and mock flags
  #    ("anythingllm_pdf_mock", "anythingllm_ws_mock") from localStorage so
  #    existing user browsers keep working after the rebrand.
  "frontend/src/models/system.ts"
  "frontend/src/models/system.js"
  "frontend/src/main.tsx"
  "frontend/src/mocks/browser.ts"
  "frontend/src/mocks/pdfAnalysisHandlers.ts"
  "frontend/src/mocks/auditHandlers.ts"

  # ── Project identity & policy docs ──────────────────
  #    Reference the upstream AnythingLLM / Mintplex Labs origin for context.
  "AGENTS.md"
  "CONTRIBUTING.md"
  "SECURITY.md"
  "CHANGELOG.md"
  "AUDIT-NEXT-AGENT.md"

  # ── Audit & feature docs (upstream context) ─────────
  "docs/ceo-audit-final.md"
  "docs/CEO-AUDIT-REPORT.md"
  "docs/admin/onboarding.md"
  "server/PDF_ANALYSIS.md"
  "server/app.doc.md"
  "scripts/skill-oci-oracle-cloud-SKILL.md"
  "RESEARCH.md"                        # research comparison doc referencing the upstream AnythingLLM/Mintplex origin for context

  # ── In-app documentation pages (upstream context) ───
  #    frontend/src/pages/Docs/content/ mirrors docs/ for the in-app docs viewer.
  "frontend/src/pages/Docs/content/"
)

# Build ripgrep exclude-from-file
EXCLUDE_FILE="$(mktemp -t opensin-branding-XXXXXX)"
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
  "Family Team Projects"
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
  echo "OpenSIN-Chat branding policy:"
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
