<!-- SPDX-License-Identifier: MIT -->

# PLAN — Scale & Deployment (Epic E5)

> **Owner:** @Family-Team-Projects
> **Created:** 2026-06-07
> **Parent:** [`PLAN-PRODUCTION-READINESS.md`](./PLAN-PRODUCTION-READINESS.md)
> **Driver:** ROADMAP Phase 3E — scaffolding exists in `cloud-deployments/`,
> not yet tested/production-grade.

## Problem

`cloud-deployments/` contains stubs for AWS, GCP, DigitalOcean, Helm, K8s,
OpenShift, and HF Spaces, plus a `docker/` dir — but there is no single,
tested, documented production deploy path, no shared session cache for
horizontal scaling, and no CDN for static assets.

## Goal

Provide one well-documented, reproducible production deployment and the
infrastructure needed to scale beyond a single node.

## Workstreams

### D1 — Production Docker image + compose
- Multi-stage build (server + frontend + collector); pinned base images.
- `docker-compose.prod.yml` with Postgres + Redis + the app.
- Healthchecks, non-root user, `.dockerignore`, documented env contract.

### D2 — Helm chart finalize
- Complete `cloud-deployments/helm/` values, probes, resources, ingress.
- `helm install` smoke-tested on a kind/minikube cluster.

### D3 — Redis session cache
- Externalize session/token state to Redis so requests can hit any node.
- Feature-flag: in-memory (single node) vs Redis (multi-node).

### D4 — CDN for static assets
- Serve `frontend/dist` assets via CDN with long-cache + content hashing.
- Keep HTML `no-cache` (already done) to avoid stale entrypoints.

## Acceptance Criteria

- [ ] `docker compose -f docker-compose.prod.yml up` boots a working stack
- [ ] `helm install` brings up a healthy pod set on a fresh cluster
- [ ] Sessions survive across ≥2 app nodes behind a load balancer
- [ ] Static assets served from CDN; HTML stays uncached
- [ ] `DEPLOYMENT_GUIDE.md` updated with the chosen golden path

## Related Issues

- E5-D1 docker · E5-D2 helm · E5-D3 redis · E5-D4 cdn
