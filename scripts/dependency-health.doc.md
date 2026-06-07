# dependency-health.cjs

Checks the **last-publish date** and **deprecation status** of every direct
dependency declared in the workspace `package.json` files, using the public npm
registry. It flags packages that are:

- **Deprecated** — the latest published version carries a `deprecated` notice.
- **Stale** — the latest version was published more than `--years` (default `2`)
  years ago, which is a strong signal of an abandoned/unmaintained package.

## Usage

```bash
node scripts/dependency-health.cjs            # default: 2-year staleness window
node scripts/dependency-health.cjs --years 3  # custom window
node scripts/dependency-health.cjs --json     # machine-readable output
```

Exit code is non-zero when deprecated packages are found, so it can gate CI.

## Scope

Scans direct dependencies + devDependencies in:
`./`, `server/`, `frontend/`, `collector/`.

Transitive dependencies are intentionally **not** checked here — that is the job
of `npm audit` (vulnerabilities) and the generated SBOM (full inventory).
