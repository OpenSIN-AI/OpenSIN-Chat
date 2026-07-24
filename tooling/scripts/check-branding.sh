#!/usr/bin/env bash
# SPDX-License-Identifier: MIT

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# Check only user-facing source and current documentation. Package identifiers,
# historical archives and legal attribution are factual contracts and excluded.
violations=0

while IFS= read -r hit; do
  file="${hit%%:*}"
  remainder="${hit#*:}"
  line_number="${remainder%%:*}"
  text="${remainder#*:}"

  case "$file" in
    README.md|docs/branding.md|docs/UPSTREAM-SYNC.md|docs/adr/*|\
    docs/deployment/vercel.md|\
    apps/web/src/pages/Docs/content/adr-*.md|\
    apps/web/src/pages/Docs/content/upstream-sync.md|\
    apps/web/src/pages/Docs/content/vercel.md)
      continue
      ;;
  esac

  # Published package identifiers and browser compatibility keys are not
  # user-facing branding.
  if [[ "$text" == *"@mintplex-labs/"* ]] ||
     [[ "$text" == *"ANYTHINGLLM_"* ]] ||
     [[ "$text" == *"anythingllm_"* ]] ||
     [[ "$text" == *"anythingllm-logo"* ]] ||
     [[ "$text" == *"anythingllm-router"* ]] ||
     [[ "$text" == *"allm-"* ]]; then
    continue
  fi

  echo "$file:$line_number:$text"
  violations=$((violations + 1))
done < <(
  git grep -nI -i -E 'AnythingLLM|Mintplex' -- \
    README.md \
    apps/web/src \
    docs \
    ':!docs/archive/**' \
    ':!docs/legal/**' \
    ':!docs/locales/**' || true
)

if [[ "$violations" -gt 0 ]]; then
  echo "Branding check failed: $violations unapproved legacy-brand reference(s)." >&2
  echo "Keep attribution in README/docs/legal and preserve only real package or compatibility identifiers in code." >&2
  exit 1
fi

echo "Branding check passed."
