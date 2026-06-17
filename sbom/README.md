<!-- SPDX-License-Identifier: MIT -->

# Software Bill of Materials (SBOM)

This directory contains the **Software Bill of Materials** for OpenSIN-Chat —
a formal, machine-readable inventory of every dependency (direct and transitive)
used across the project's four Node.js workspaces.

## Why an SBOM?

An SBOM answers the question *"what exactly is in our software?"*:

- **Security** — when a CVE is announced, you can instantly check whether a
  vulnerable package (and version) is present, instead of grepping lockfiles.
- **Compliance** — required by EU CRA, US Executive Order 14028, and most
  enterprise procurement checklists.
- **Auditability** — a deterministic artifact that can be diffed between
  releases to see exactly what changed in the supply chain.
- **License tracking** — every component is listed with a PURL so license
  obligations can be traced.

## Formats

Two industry-standard formats are generated side by side:

| Format | Spec | File(s) |
|--------|------|---------|
| **SPDX** | [SPDX 2.3](https://spdx.github.io/spdx-spec/v2.3/) JSON | `opensin-chat-spdx.json` (consolidated) + `<workspace>.spdx.json` |
| **CycloneDX** | [CycloneDX 1.5](https://cyclonedx.org/docs/1.5/) JSON | `opensin-chat-cyclonedx.json` (consolidated) + `<workspace>.cdx.json` |

## Files

### Consolidated (project-level)

A single SBOM that merges **all** workspaces, deduplicated by `name@version`.

| File | Description |
|------|-------------|
| `opensin-chat-spdx.json` | SPDX 2.3 — entire project, ~1900 unique packages |
| `opensin-chat-cyclonedx.json` | CycloneDX 1.5 — entire project, ~1900 unique packages |

### Per-workspace

Granular SBOMs for each Node.js workspace, useful for scoped vulnerability
analysis.

| File | Workspace | Packages |
|------|-----------|----------|
| `root.spdx.json` / `root.cdx.json` | Root monorepo | ~70 |
| `server.spdx.json` / `server.cdx.json` | Backend API (Express + Prisma) | ~1100 |
| `frontend.spdx.json` / `frontend.cdx.json` | Vite + React 18 SPA | ~900 |
| `collector.spdx.json` / `collector.cdx.json` | Document ingestion service | ~570 |

### Manifest

| File | Description |
|------|-------------|
| `index.json` | Summary manifest — generation timestamp, package counts, file paths |

## How to regenerate

```bash
# Generate all SBOMs (per-workspace + consolidated) into sbom/
yarn sbom
# or: node scripts/generate-sbom.cjs

# CI validation mode — verifies all SBOM files exist and are valid JSON
yarn sbom:check
# or: node scripts/generate-sbom.cjs --check
```

The generator (`scripts/generate-sbom.cjs`) parses lockfiles directly
(`yarn.lock` v1 or `package-lock.json` v2/v3) so it runs **deterministically
without installing `node_modules` or hitting the network**. Workspaces without
a usable lockfile fall back to their `package.json` declared dependency ranges.

## CI integration

The [`.github/workflows/sbom.yml`](../.github/workflows/sbom.yml) workflow:

- Runs on every push to `main` that touches a `package.json`, lockfile, or the
  generator script.
- Runs on every published GitHub Release.
- Can be triggered manually via `workflow_dispatch`.
- Generates the SBOM, validates it, uploads it as a workflow artifact
  (90-day retention), and — for releases — attaches the SBOM files directly to
  the GitHub release page.

The `CEO Audit` workflow also runs `yarn sbom:check` to verify the committed
SBOMs are present and valid.

## Tooling

These SBOMs are consumable by:

- [Dependency-Track](https://dependencytrack.org/) — continuous vulnerability
  monitoring from CycloneDX.
- [OWASP Dep-Check](https://owasp.org/www-project-dependency-check/) — CVE
  matching from SPDX.
- [`syft`](https://github.com/anchore/syft) / [`grype`](https://github.com/anchore/grype) —
  Anchore's SBOM + vulnerability scanner.
- GitHub's Dependency Graph / Dependabot (separate, but complementary).

## References

- GitHub Issues: [#4](https://github.com/OpenSIN-AI/OpenSIN-Chat/issues/4),
  [#23](https://github.com/OpenSIN-AI/OpenSIN-Chat/issues/23)
- NTIA SBOM minimum elements:
  <https://www.ntia.gov/files/ntia/publications/sbom_minimum_elements.pdf>
