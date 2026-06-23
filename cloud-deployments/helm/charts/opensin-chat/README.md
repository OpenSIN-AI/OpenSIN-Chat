# opensin-chat

![Version: 1.1.0](https://img.shields.io/badge/Version-1.1.0-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 1.14.0](https://img.shields.io/badge/AppVersion-1.14.0-informational?style=flat-square)

[OpenSIN Chat](https://github.com/OpenSIN-AI/OpenSIN-Chat)

Self-hostable AI workspace with RAG, AI agents, MCP compatibility, and political research tools.

## Quick Start

```bash
# Single-node (SQLite, no Redis)
helm install opensin-chat ./cloud-deployments/helm/charts/opensin-chat

# Multi-node (Postgres + Redis, auto-scaling)
helm install opensin-chat ./cloud-deployments/helm/charts/opensin-chat \
  -f values-prod.yaml
```

### values-prod.yaml example

```yaml
replicaCount: 2
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1

redis:
  enabled: true

podDisruptionBudget:
  enabled: true
  minAvailable: 1

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
  targetCPUUtilizationPercentage: 80

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: chat.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: chat-tls
      hosts:
        - chat.example.com

resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: "2"
    memory: 4Gi

# External Redis (if not using bundled subchart)
# redis:
#   enabled: true
#   url: "redis://my-redis:6379"

# External Postgres (set via env)
env:
  - name: PGVECTOR_CONNECTION_STRING
    valueFrom:
      secretKeyRef:
        name: postgres-secret
        key: connection-string
```

## Configuration

### Config vs Secrets

- `config` (in `values.yaml`) — rendered into a `ConfigMap` and injected using `envFrom`. Do NOT place sensitive values here.
- `env` / `envFrom` — the preferred way to inject secrets. Use Kubernetes `Secret` objects.

```bash
kubectl create secret generic opensin-secrets \
  --from-literal=AUTH_TOKEN="..." \
  --from-literal=JWT_SECRET="..." \
  --from-literal=PGVECTOR_CONNECTION_STRING="postgresql://..."
```

```yaml
envFrom:
  - secretRef:
      name: opensin-secrets
```

### Redis (E5-D3)

The app uses **JWT for authentication** (stateless), so sessions work across
nodes without a shared session store. Redis is used for **rate limiting** only.

When `redis.enabled: true`:
- `RATE_LIMIT_BACKEND=redis` and `REDIS_URL` are injected automatically
- If `redis.url` is set, that URL is used (external Redis)
- If `redis.url` is empty, the bundled Redis subchart service name is used

### Probes

Probes use the `/ping` endpoint on port 3001 (the actual health endpoint).
A startup probe prevents premature liveness failures during Prisma migrations.

### Scaling

- **Single-node:** `replicaCount: 1`, `strategy: Recreate`, PVC with `ReadWriteOnce`
- **Multi-node:** `replicaCount: 2+`, `strategy: RollingUpdate`, PVC requires `ReadWriteMany` or external storage (S3, NFS)
- **HPA:** Enable `autoscaling.enabled: true` for CPU/memory-based auto-scaling
- **PDB:** Enable `podDisruptionBudget.enabled: true` to prevent voluntary evictions from taking down all replicas
- **WebSocket sticky sessions:** For agent streaming across multiple nodes, configure sticky sessions at the load balancer (nginx `ip_hash`, Cloudflare `session_affinity`)

### Storage

The chart creates a PVC using `persistentVolume.*` settings. For multi-node
deployments, either:
1. Use a `ReadWriteMany` storage class (NFS, CephFS, EFS)
2. Set `persistentVolume.existingClaim` to a pre-provisioned shared volume
3. Use external object storage (S3) and remove the PVC mount

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| replicaCount | int | `1` | Number of pod replicas |
| image.repository | string | `"ghcr.io/opensin-ai/opensin-chat"` | Container image repository |
| image.tag | string | `""` | Image tag (defaults to appVersion) |
| image.pullPolicy | string | `"IfNotPresent"` | Image pull policy |
| strategy.type | string | `"RollingUpdate"` | Deployment strategy |
| config | object | see values | ConfigMap env vars |
| env | list | `[]` | Extra env vars (for secret refs) |
| envFrom | list | `[]` | envFrom refs |
| service.type | string | `"ClusterIP"` | Service type |
| service.port | int | `3001` | Service port |
| redis.enabled | bool | `false` | Enable Redis for rate limiting |
| redis.url | string | `""` | External Redis URL (empty = bundled) |
| podDisruptionBudget.enabled | bool | `false` | Enable PDB |
| podDisruptionBudget.minAvailable | int | `1` | Minimum available pods |
| autoscaling.enabled | bool | `false` | Enable HPA |
| autoscaling.minReplicas | int | `2` | Minimum replicas for HPA |
| autoscaling.maxReplicas | int | `5` | Maximum replicas for HPA |
| autoscaling.targetCPUUtilizationPercentage | int | `80` | CPU target for HPA |
| serviceMonitor.enabled | bool | `false` | Enable Prometheus ServiceMonitor |
| ingress.enabled | bool | `false` | Enable Ingress |
| persistentVolume.size | string | `"8Gi"` | PVC size |
| persistentVolume.mountPath | string | `"/app/server/storage"` | Mount path |
| resources.requests | object | `{cpu: 250m, memory: 512Mi}` | Resource requests |
| resources.limits | object | `{cpu: 1, memory: 2Gi}` | Resource limits |
| startupProbe | object | see values | Startup probe config |
| readinessProbe | object | see values | Readiness probe config |
| livenessProbe | object | see values | Liveness probe config |
