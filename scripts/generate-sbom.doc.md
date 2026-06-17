# generate-sbom.cjs

Generates a Software Bill of Materials (SBOM) for every workspace in the repo
in both **SPDX 2.3** and **CycloneDX 1.5** JSON formats. Resolves Issues #4 and
#23 and the CEO Audit `COMPL-SBOM` finding.

## Usage

```bash
node scripts/generate-sbom.cjs          # write SBOMs into sbom/
node scripts/generate-sbom.cjs --check  # CI: verify SBOMs exist and are valid
```

## Why not `npm sbom`?

`npm sbom` requires a fully installed `node_modules` tree and fails with
`ESBOMPROBLEMS` otherwise. This project uses `yarn.lock` (v1) for
`server`/`frontend`/`collector`. To keep SBOM generation deterministic and
network-free in CI, this script parses lockfiles directly:

- `package-lock.json` (npm lockfile v2/v3) — preferred when present
- `yarn.lock` (v1) — parsed for `name@range -> version`
- `package.json` declared ranges — fallback only

## Output (`sbom/`)

### Per-workspace

| File | Format |
| ---- | ------ |
| `<workspace>.spdx.json` | SPDX 2.3 |
| `<workspace>.cdx.json`  | CycloneDX 1.5 |

### Consolidated (project-level, deduplicated across all workspaces)

| File | Format |
| ---- | ------ |
| `opensin-chat-spdx.json`      | SPDX 2.3 |
| `opensin-chat-cyclonedx.json` | CycloneDX 1.5 |

### Manifest

| File | Format |
| ---- | ------ |
| `index.json` | Summary: per-workspace source + package counts + consolidated refs |

Each package carries a [PURL](https://github.com/package-url/purl-spec)
(`pkg:npm/...`) identifier for downstream vulnerability scanning.

## CI

- `.github/workflows/sbom.yml` — dedicated workflow: generates, validates,
  uploads as artifact, and attaches to GitHub releases.
- `.github/workflows/ceo-audit.yml` — runs `--check` to ensure committed SBOMs
  are present and valid on every push.
