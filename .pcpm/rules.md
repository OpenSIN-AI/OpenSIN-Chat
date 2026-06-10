# Project Rules

- [2026-06-09T05:24:26.454Z] Never use  to silently swallow promise rejections. Always use  so errors are visible in logs. (priority: -1)

- [2026-06-09T05:44:40.203Z] For all OpenAI-compatible local/self-hosted providers, NEVER use  in the OpenAI SDK constructor. The SDK throws "Missing credentials" on null/empty apiKey. Always use  with a placeholder string. This applies to all provider/index.js files and any agent provider files that create OpenAI clients. (priority: -1)

- [2026-06-09T11:57:00.000Z] BEFORE any Docker rebuild or deploy: ALWAYS run `lsof -i :3001 -P -n`. If `node` is listening on port 3001 (a rogue manually-started `node index.js`), KILL it first with `kill <PID>`. Otherwise the Docker container's port mapping is shadowed and cloudflared tunnel connects to the old process instead of the new container. Fix: `kill <PID>` → `docker compose down && docker compose up -d` → restart cloudflared. (priority: -10)

- [2026-06-09T11:57:30.000Z] ALWAYS use `docker compose build --no-cache` (never without `--no-cache`). Docker caches the `yarn build` layer; without `--no-cache` the old frontend bundle survives in the image and the new code never reaches the browser. (priority: -10)

- [2026-06-09T11:57:45.000Z] After any git cherry-pick, rebase, or merge conflict resolution, ALWAYS run `rg '<<<<<<< |=======|>>>>>>> ' frontend/src/ --files-with-matches` BEFORE running `npx vite build` or `docker compose build`. Leftover conflict markers crash the Vite build with "Unexpected <<" and produce no output bundle — the old bundle persists silently. Fix: remove conflict markers (keep HEAD version) and rebuild. (priority: -10)

- [2026-06-09T11:58:00.000Z] The live site openafd.delqhi.com runs via Cloudflare DNS → Cloudflare Tunnel (cloudflared) → localhost:3001 → Docker container. NEVER use force-push on main. NEVER commit secrets/api keys. If the live site shows old content, check: (1) `lsof -i :3001` for rogue node, (2) `ps aux | grep cloudflared` for tunnel, (3) `docker ps` for container health, (4) `curl -s http://localhost:3001/index.js | grep -c 'Zugang erhalten'` for PasswordGate in bundle. (priority: -10)

- [2026-06-09T11:58:15.000Z] For quick frontend-only deploys (no Dockerfile/package.json changes): use `docker cp frontend/dist/. openafd:/app/server/public/` instead of a full image rebuild. Express serves static files directly from disk, so no restart needed. Full `docker compose build --no-cache` is only required when Dockerfile or npm dependencies change. (priority: -5)

- [2026-06-10T08:00:00.000Z] ALWAYS set `restart: always` in `docker-compose.yml` for every service (both openafd and opensin-chat). Without it, container stays dead after OrbStack/Docker restart → Cloudflare → 502. `docker update --restart always <container>` applies live (0 downtime). Never deploy a new compose without it. (priority: -10)
