# Deployment environments

`deployment-schema.json` and the files in `overlays/` are the source of truth
for deployment identity. The shared non-production deployment is **preview**,
not beta. This is a direct owner decision dated 7 November 2026.

| Deployment | Technical target / runtime environment |
| --- | --- |
| development | development |
| local-staging | Existing local test/staging projection |
| preview | staging |
| production | production |

Canonical paths are `overlays/preview.json`, `docker_sl/releases/preview/` and
`k8s/preview/`. Compose service suffixes use `_preview`; Kubernetes namespace
and internal service DNS use `mercurion-preview`. Staging build targets, APP_ENV,
PY_ENV and NATS subject prefixes remain unchanged.

**Future integration conflicts must preserve this preview deployment naming.**
Older T21 branches or historical specifications using beta for this environment
must be reconciled to these canonical paths and mappings, preserving their
unrelated changes. This does not authorize choosing an entire side of a conflict
or dropping subsequent functional fixes.

`npm run ci:deployment` rejects an overlay that restores the obsolete beta
deployment identity. `node scripts/test-tox21-compose.mjs` checks resolved
preview/production consumers and optional build overrides without starting services.

Beta remains a valid feature/release maturity concept, including in production.
This deployment rename does not change feature flags, release-context enum values,
or existing frontend release badges. Those are separate contracts.

No existing cluster namespace, DNS/provider setting or running service is migrated
by this source change. Tracked files are moved; ignored personal env/key files
are neither read nor moved. Legacy directories stay ignored to protect local
material. Before a future deployment, supply configuration under the canonical
preview paths and plan any existing Kubernetes namespace migration explicitly.
