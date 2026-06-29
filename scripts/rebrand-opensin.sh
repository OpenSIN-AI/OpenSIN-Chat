#!/usr/bin/env bash
# SPDX-License-Identifier: MIT

# Migriert OpenAfD -> OpenSIN über den gesamten Tree.
# WICHTIG: laesst Upstream-Credits (AnythingLLM/Mintplex) und funktionale
# Kompat-Bezeichner (Storage-Keys, env-Var-Whitelist, DB-Dateiname) unberuehrt.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Dateien, die NICHT angefasst werden duerfen (Lockfiles, Lizenz, Credit-Dateien).
EXCLUDE='(^|/)(LICENSE|LICENSE\.md|THIRD_PARTY\.md|BRANDING\.md|pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$'

# 1) Anzeige-/Marken-Strings ersetzen (NICHT die kleingeschriebenen Storage-Keys).
git ls-files -z \
  | grep -zvE "$EXCLUDE" \
  | xargs -0 perl -i -pe '
      s/OpenAfD Chat/OpenSIN Chat/g;
      s/OpenAfD/OpenSIN/g;
      s/openafd-chat/opensin-chat/g;
    '

# 2) Domains / URLs / Repo-Pfade anpassen.
git ls-files -z | grep -zvE "$EXCLUDE" | xargs -0 perl -i -pe '
  s#openafd\.delqhi\.com#opensin.delqhi.com#g;
  s#docs\.openafd\.com#docs.opensin.delqhi.com#g;
  s#Family-Team-Projects/OpenAfD-Chat#OpenSIN-AI/OpenSIN-Chat#g;
'

# 3) Package-Namen (npm scope-frei) angleichen.
git ls-files -z 'package.json' '*/package.json' \
  | xargs -0 perl -i -pe 's/"openafd-chat/"opensin-chat/g;'

# ------------------------------------------------------------------
# BEWUSST NICHT ersetzt (sonst brechen Sessions/Storage/Boot):
#   - lower-case "openafd" als Storage-Key-Prefix (z. B. openafd_authToken)
#   - server/storage/openafd.db (DB-Dateiname; siehe package.json prisma:reset)
#   - ANYTHINGLLM_* env-Vars (Upstream-Kompat, scripts/check-branding.sh Whitelist)
# Wenn du diese WIRKLICH migrieren willst, mach das in einem separaten,
# getesteten Commit mit Daten-Migration.
# ------------------------------------------------------------------

echo "Rebrand-Textersetzung fertig. Jetzt pruefen:"
echo "  git diff"
echo "  bash scripts/check-branding.sh"
echo "  yarn lint:ci   # Build/Lint gegenpruefen"
