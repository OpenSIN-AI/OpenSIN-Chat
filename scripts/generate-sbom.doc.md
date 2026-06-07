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

| File | Format |
| ---- | ------ |
| `<workspace>.spdx.json` | SPDX 2.3 |
| `<workspace>.cdx.json`  | CycloneDX 1.5 |
| `index.json`            | Manifest: per-workspace source + package counts |

Each package carries a [PURL](https://github.com/package-url/purl-spec)
(`pkg:npm/...`) identifier for downstream vulnerability scanning.

## CI

Run in `.github/workflows/ceo-audit.yml` via `--check` to ensure SBOMs are
committed and valid on every push.
