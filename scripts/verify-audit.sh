#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Verifies all Master/CEO-Audit fixes are in place.
# Usage: bash scripts/verify-audit.sh   (from repo root)
set -uo pipefail

FAIL=0
pass() { echo "  [PASS] $1"; }
fail() { echo "  [FAIL] $1"; FAIL=1; }

echo "== 1. #116/#112 — no apiKey: null in agent providers =="
if grep -rqn "apiKey: null" server/utils/agents/aibitat/providers/; then
  fail "apiKey: null still present:"
  grep -rn "apiKey: null" server/utils/agents/aibitat/providers/
else
  pass "no 'apiKey: null' remaining in agent providers"
fi

echo "== 2. #108 — vite.config.js must not expose full process.env =="
if grep -Eq '"process\.env"\s*:\s*process\.env' frontend/vite.config.js; then
  fail "vite.config.js still exposes the whole process.env"
else
  pass "process.env not fully exposed"
fi
if grep -q 'process.env.NODE_ENV' frontend/vite.config.js; then
  pass "NODE_ENV whitelist present"
else
  fail "NODE_ENV whitelist missing in vite.config.js"
fi

echo "== 3. #105 — no conflicting height classes in LoadingChat =="
if grep -q 'h-\[calc(100%-32px)\]' frontend/src/components/WorkspaceChat/LoadingChat/index.tsx 2>/dev/null; then
  fail "conflicting h-[calc(...)] class still in LoadingChat"
else
  pass "LoadingChat height handled via style prop"
fi

echo "== 4. #104 — no raw STORAGE_DIR usage outside paths.js =="
RAW=$(grep -rln "process.env.STORAGE_DIR" server/utils/ collector/utils/ 2>/dev/null | grep -v "paths.js" || true)
if [ -n "$RAW" ]; then
  fail "raw STORAGE_DIR usage found in: $RAW"
else
  pass "all STORAGE_DIR access goes through paths helpers"
fi

echo "== 5. paths.js exports both helpers =="
if grep -q "getCollectorPath" server/utils/paths.js; then
  pass "getCollectorPath helper present"
else
  fail "getCollectorPath helper missing in server/utils/paths.js"
fi

echo "== 6. Node syntax check on touched server files =="
for f in \
  server/utils/paths.js \
  server/utils/files/index.js \
  server/utils/files/multer.js \
  server/utils/agents/aibitat/providers/ai-provider.js \
  server/utils/agents/aibitat/providers/koboldcpp.js \
  server/utils/agents/aibitat/providers/foundry.js \
  server/utils/agents/aibitat/providers/privatemode.js \
  server/utils/agents/aibitat/providers/dellProAiStudio.js; do
  if node --check "$f" 2>/dev/null; then
    pass "syntax OK: $f"
  else
    fail "syntax ERROR: $f"
  fi
done

echo "== 7. paths.js fallback must stay inside the repo =="
node -e '
delete process.env.STORAGE_DIR;
const path = require("path");
const { getStoragePath, getCollectorPath } = require("./server/utils/paths.js");
const serverStorage = path.resolve(__dirname, "server", "storage");
const collector = path.resolve(__dirname, "collector");
if (getStoragePath() !== serverStorage) { console.error("getStoragePath fallback wrong: " + getStoragePath()); process.exit(1); }
if (getCollectorPath() !== collector) { console.error("getCollectorPath fallback wrong: " + getCollectorPath()); process.exit(1); }
' && pass "paths fallbacks resolve to server/storage and <repo>/collector" || fail "paths.js fallback resolution incorrect"

echo "== 8. multer.js must not bypass the paths helpers =="
if grep -q "process.env.STORAGE_DIR" server/utils/files/multer.js; then
  fail "multer.js still reads process.env.STORAGE_DIR directly"
else
  pass "multer.js resolves all paths via paths.js helpers"
fi

echo
if [ "$FAIL" -eq 0 ]; then
  echo "ALL AUDIT CHECKS PASSED."
  exit 0
else
  echo "AUDIT CHECKS FAILED — see [FAIL] lines above."
  exit 1
fi
