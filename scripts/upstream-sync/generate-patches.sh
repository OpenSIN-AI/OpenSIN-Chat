#!/usr/bin/env bash
# OpenAfD-Chat — Upstream Sync Patch Generator (Option A: Squash-Patch-Serie)
# ----------------------------------------------------------------------------
# Generates 6 atomic patch groups from upstream Mintplex-Labs/anything-llm
# covering the 27 commits released between v1.13.0 and current upstream master.
#
# Strategy: emit one unified-diff per commit via `git format-patch`, then
# sort the resulting .patch files into 6 sub-directories (one per logical
# group). Each per-commit patch is relative to its parent commit, so the
# patches compose linearly when applied with `git am`.
#
# Apply with `apply-patches.sh` which uses `git am --3way` so the maintainer
# resolves any conflict against the OpenAfD-Chat rebrand interactively.
#
# Docs: scripts/upstream-sync/upstream-sync.doc.md
# Strategy: docs/UPSTREAM-SYNC.md
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

UPSTREAM="${UPSTREAM_REMOTE:-upstream}"
V1_13="v1.13.0"
MASTER_REF="${UPSTREAM}/master"

# ── Verify remotes ───────────────────────────────────────────────────
if ! git remote get-url "$UPSTREAM" >/dev/null 2>&1; then
  echo "❌ Remote '$UPSTREAM' not configured."
  echo "   Add it with:  git remote add upstream https://github.com/Mintplex-Labs/anything-llm.git"
  exit 1
fi

echo "→ Fetching upstream tags + master ..."
git fetch --tags "$UPSTREAM" master 2>&1 | tail -3

if ! git rev-parse "$V1_13" >/dev/null 2>&1; then
  echo "❌ Tag $V1_13 not found after fetch."
  exit 1
fi

UPSTREAM_HEAD="$(git rev-parse "$MASTER_REF")"
echo "→ Upstream master HEAD:  $UPSTREAM_HEAD"
echo "→ v1.13.0 base:          $(git rev-parse "$V1_13")"

# ── Commit group classification ──────────────────────────────────────
# Each upstream commit SHA is mapped to exactly one group below.
# Groups are applied in numerical order (01 → 06) by apply-patches.sh.
#
# Format: "group-name" followed by SHAs.
GROUP_01_SECURITY="c3058d44 0002d229 de531042 d01c2a20"
GROUP_02_BUGFIX="7db6d233 d81a7847 c0e94148 cc518056 cba598ed"
GROUP_03_VOICE="9c6ab7ca 15b79663"
GROUP_04_DOCS="cc28024c 43e0d9a4"
GROUP_05_LLM="bee22417 65086984 35b4132f 272bf201 54b53094"
GROUP_06_UI_DOCS="63ee6569 668b2734 7c1e55c1 7a04eceb 2c22e9dc"

# ── Generate per-commit patches in /tmp ─────────────────────────────
TMP_DIR="$(mktemp -d -t openafd-sync-XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo ""
echo "→ Generating per-commit patches with git format-patch ..."
echo ""

# We need to format-patch against the upstream remote ref. Easiest: cd to
# a worktree-less approach by using `git --git-dir=<repo>/.git format-patch
# -o <tmp> <base>..<head>` — but plain format-patch works in the main repo
# if the range is read-only fetch refs (no checkout needed).
cd "$REPO_ROOT"
# `git format-patch` writes the patches and may also advance HEAD? No,
# format-patch is read-only — it just diffs and writes files.
git format-patch -o "$TMP_DIR" "$V1_13..$MASTER_REF" 2>&1 | tail -5
echo ""

# ── Distribute into group directories ───────────────────────────────
PATCH_DIR="$(cd "$(dirname "$0")" && pwd)/patches"
rm -rf "$PATCH_DIR"
mkdir -p "$PATCH_DIR"

mkdir -p "$PATCH_DIR/01-security-hardening"
mkdir -p "$PATCH_DIR/02-critical-bugfixes"
mkdir -p "$PATCH_DIR/03-voice-features"
mkdir -p "$PATCH_DIR/04-document-handling"
mkdir -p "$PATCH_DIR/05-llm-providers"
mkdir -p "$PATCH_DIR/06-ui-docs"

# Helper: distribute a list of SHAs to their destination directory.
distribute() {
  local group_dir="$1"
  shift
  for sha in "$@"; do
    # Find the patch file. `git format-patch` names files `0001-SUBJECT.patch`
    # and the subject line contains the short SHA. We can grep for it.
    patch=$(grep -lE "^From [0-9a-f]{40} ${sha} " "$TMP_DIR"/*.patch 2>/dev/null | head -1 || true)
    # Fallback: match by short SHA at the start of the subject in the From line
    if [ -z "$patch" ]; then
      patch=$(grep -lE "${sha}" "$TMP_DIR"/*.patch 2>/dev/null | head -1 || true)
    fi
    if [ -n "$patch" ] && [ -f "$patch" ]; then
      cp "$patch" "$group_dir/"
    else
      echo "  ⚠  $sha  — no patch found in $TMP_DIR (might be a merge commit, skipping)"
    fi
  done
}

echo "→ Distributing patches into 6 groups ..."
distribute "$PATCH_DIR/01-security-hardening" $GROUP_01_SECURITY
distribute "$PATCH_DIR/02-critical-bugfixes"   $GROUP_02_BUGFIX
distribute "$PATCH_DIR/03-voice-features"      $GROUP_03_VOICE
distribute "$PATCH_DIR/04-document-handling"   $GROUP_04_DOCS
distribute "$PATCH_DIR/05-llm-providers"       $GROUP_05_LLM
distribute "$PATCH_DIR/06-ui-docs"             $GROUP_06_UI_DOCS

# ── Manifest ────────────────────────────────────────────────────────
MANIFEST="$PATCH_DIR/MANIFEST.md"
{
  echo "# Upstream Sync Patches — Manifest"
  echo ""
  echo "Generated: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "Upstream HEAD: \`$UPSTREAM_HEAD\`"
  echo "v1.13.0 base:  \`$(git rev-parse "$V1_13")\`"
  echo ""
  echo "Strategy: one \`.patch\` per upstream commit (per-commit format-patch)."
  echo "Each patch is relative to its parent commit, so they compose linearly."
  echo "Apply with \`./apply-patches.sh\` which uses \`git am --3way\`."
  echo ""
  for grp in 01-security-hardening 02-critical-bugfixes 03-voice-features \
             04-document-handling 05-llm-providers 06-ui-docs; do
    n=$(ls "$PATCH_DIR/$grp"/*.patch 2>/dev/null | wc -l | tr -d ' ')
    echo "## $grp  ($n patch$( [ "$n" != "1" ] && echo "es" ))"
    echo ""
    for f in "$PATCH_DIR/$grp"/*.patch; do
      [ -f "$f" ] || continue
      subject=$(grep -m1 '^Subject: ' "$f" | sed 's/^Subject: //')
      sha_line=$(grep -m1 '^From [0-9a-f]' "$f" | awk '{print $2}')
      short=$(git log -1 --format="%h" "$sha_line" 2>/dev/null || echo "${sha_line:0:8}")
      echo "- \`$short\` — $subject"
    done
    echo ""
  done
  echo "## Apply order"
  echo ""
  echo "01 → 02 → 03 → 04 → 05 → 06 (cumulative, in chronological order)."
} > "$MANIFEST"

echo ""
echo "→ Wrote manifest:  $MANIFEST"
echo ""
echo "Patches:"
ls -la "$PATCH_DIR"/*/ 2>/dev/null
echo ""
echo "Done. Next:  ./apply-patches.sh"
