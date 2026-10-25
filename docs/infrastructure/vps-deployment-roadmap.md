# Mercurion VPS infrastructure & deployment roadmap

> **Version:** 0.1.0 (initial planning baseline)  
> **Updated:** 2026-10-25  
> **Status:** PLANNING — no VPS purchase, provisioning, migration, or production deployment is recorded by this document.  
> **Repository branch at creation:** `bugfix/6abfd27de7c18baf04198c71-technical-debt-recovery-2`  
> **Ownership:** human-led infrastructure planning; execution and acceptance require explicit review.

## 1. Purpose, boundaries, and working method

This is the **infrastructure roadmap**, deliberately separate from the repository's application/product roadmap (`roadmap.md`). It covers VPS procurement, operating system, network security, Docker Compose deployment, data migration, operational tooling, staging/production rollout, and later RustDesk integration. It is **not** an autonomous task recipe, a deployment runbook, or a claim that any step has been completed.

- Scope: **one unmanaged VPS** hosting Mercurion **production**, a low-load **staging** environment, a shared **core** layer, and subsequently RustDesk; allow modest future backends if capacity remains.
- Local **development stays on the developer workstation by default**. A third always-on VPS environment is **not included** in the baseline: if required later, revisit RAM/storage sizing before deploying it.
- Target: **Docker Engine + Docker Compose** on Linux; retain Kubernetes manifests as a reproducible case-study alternative, not the selected runtime.
- Prefer incremental, reversible steps and acceptance tests over premature automation or extra infrastructure products.
- Make updates **in this file**: mark checkpoints, attach evidence/commit or runbook links, revise assumptions, and append to the change log.
- Never store IP addresses, credentials, SSH keys, tunnel tokens, production API keys, or private backups in this document.

### Status convention

- `PLANNED`: approved scope but not executed.
- `OPEN`: requires measurement, research, or a choice before execution.
- `DONE`: evidence-backed validation completed.
- `BLOCKED`: prerequisite or acceptance test failed.

Checkboxes below start unchecked. Check off a phase **only after** its acceptance criteria have been verified.

## 2. Baseline decisions and unresolved gates

| ID | Decision / constraint | Initial state |
| --- | --- | --- |
| D-01 | Single VPS; preferred candidate: Netcup VPS Lite 4 G12.5s, **16 shared vCore / 32 GB RAM / 640 GB SSD**. Confirm available configuration, VAT, traffic policy, upgrade route, backups, and terms **at checkout**. | Candidate, purchase pending |
| D-02 | Linux host: **Debian 13 minimal**, security updates, Docker Engine + Compose. | Preferred |
| D-03 | Separate Compose projects/networks: `core`, `staging`, `prod`, later `rustdesk`. | Agreed design |
| D-04 | One **shared Meilisearch** (~55 GB molecular indexes); molecule indexes immutable to runtime clients, **log/audit indexes writable and segregated per environment**. | Agreed design; application adjustments needed |
| D-05 | Production and staging use independent PostgreSQL/pgvector, Redis, NATS, Angular, NestJS, Tox21, and Nginx stacks. Staging has **smaller resource budgets**. | Agreed design |
| D-06 | Public Mercurion HTTP(S) passes **only through Cloudflare Tunnel**, never directly through the VPS public IPv4/IPv6; no public host 80/443 mappings. | Security invariant |
| D-07 | Independent ingress routes/tunnel credentials for `prod` and `staging`; staging additionally protected by Cloudflare Access. | Preferred, validate |
| D-08 | Nginx edge in each environment listens on **HTTP port 80 inside its container**. Cloudflare handles public TLS, HTTPS redirect, and HSTS. | Preferred, adapt current edge config |
| D-09 | Private Meilisearch log viewer, **SSH local port forwarding**, no public dashboard hostname or API exposure. | Preferred, validate end-to-end forwarding |
| D-10 | RustDesk **must fit on the same VPS**. Transport and public-inbound security policy are a separate pre-activation decision. **No second VPS** in the baseline. | Reserved capacity, transport OPEN |
| D-11 | Production readiness requires restore testing (especially HNSW), external backup + restore evidence, resource telemetry, and direct-origin-block tests. | Required gate |

**Important network distinction.** “Mercurion cannot be reached by public IP” is compatible with **native RustDesk-only ingress ports** on the same IP, because those ports do not expose Mercurion. “The public IP must accept **no** direct inbound connections of any kind” is **not** compatible with public RustDesk OSS native TCP/UDP ports. Resolve this policy distinction before RustDesk activation; do not assume OSS WSS-only clients can replace native ports without license/protocol testing. A DNS-only RustDesk record would reveal the VPS origin IP, which must **not** permit a Cloudflare bypass of Mercurion.

## 3. Target topology and trust boundaries

```text
Visitors
  -> Cloudflare HTTPS/WAF
      -> production hostname -> production Tunnel -> prod Nginx:80
      -> staging hostname    -> Cloudflare Access -> staging Tunnel -> staging Nginx:80

Single Netcup VPS
  core:     Meilisearch with shared molecular indexes + isolated log/audit indexes
  prod:     Nginx -> Angular/NestJS -> PostgreSQL/pgvector, Redis, NATS, Tox21
  staging:  Nginx -> Angular/NestJS -> independent PG, Redis, NATS, Tox21
  admin:    protected SSH transport -> local port forwarding -> private log viewer/API
  rustdesk: future isolated hbbs/hbbr stack; ingress design remains gated

Public VPS 80/443: CLOSED. Database/Redis/NATS/Meilisearch ports: NOT PUBLIC.
RustDesk native ports: CLOSED until separately approved, tested, and activated.
```

### Routing, TLS, and origin rules

1. Example public names (replace before provisioning): `app.mercurion.example` and `staging.mercurion.example`. Cloudflare routes hostnames to the matching Tunnel, then to the matching **internal Docker service**. DNS alone does not choose a container.
2. Run separate `cloudflared` identities/containers for staging and production, each attached **only to its own Nginx ingress network**. One public IPv4 is sufficient; no host port 80/443 bind.
3. Each edge Nginx listens on `80` within its container; internal Angular Nginx (currently `3497`) and NestJS (currently `8098`) remain private. No origin certificate is required for HTTP on the local container hop; Cloudflare-to-`cloudflared` is encrypted, but `cloudflared`-to-Nginx HTTP is **not independently TLS-encrypted**.
4. Adapt existing [Kubernetes edge configuration](../../k8s/beta/nginx-edge-config.yaml): remove origin-only 80-to-443 redirects, local `listen 443 ssl`, certificate mounts, and Nginx HSTS; preserve application routing, maintenance logic, error pages, and WebSocket upgrade support. Configure HSTS at Cloudflare **only after** testing every affected subdomain; treat `includeSubDomains` / `preload` as separate decisions.
5. Since Nginx receives plain HTTP from its local connector, do not forward `$scheme` as if it represented the browser scheme. Normalize the trusted external scheme to HTTPS (e.g., `X-Forwarded-Proto: https`) and validate cookies, redirects, OAuth/SSO callbacks, canonical URLs, and Socket.IO.
6. Validate actual client-IP propagation through Tunnel. Trust `CF-Connecting-IP` only from the controlled connector path; do **not** blindly trust client-supplied headers or treat Cloudflare public source CIDRs as the Nginx peer when the peer is `cloudflared`.
7. A deny-by-default inbound firewall applies to **IPv4 and IPv6**. Validate provider firewall + Linux firewall + Docker published-port behavior; do not assume UFW alone constrains Docker. Administrative SSH must have a tested private/Access-backed route before public SSH is disabled.
8. Cloudflare Access protects staging (and any administrative SSH access path); production remains publicly reachable through Cloudflare with appropriate WAF/rate-limit/cache policies.

### Isolation and data ownership

- `prod` and `staging` have their own Compose project names, backend networks, secrets, databases, Redis and NATS instances, and persistent volumes.
- `core` holds the single Meilisearch service/volume. Grant only explicitly permitted cross-stack connectivity to its API. Do not create a general bridge between production and staging.
- Keep PostgreSQL, Redis, NATS, Meilisearch, and private viewers unbound to the public host interfaces. Prefer no `ports` entries; if administrative port forwarding requires a host binding, use **127.0.0.1 only**, with firewall and external reachability verification.
- Keep RustDesk's networks, secrets, container privileges, and volumes independent. Do not use `network_mode: host` casually if strict separation is a requirement; test a bridge-mode native RustDesk deployment and its NAT traversal/relay before accepting it.
- The VPS remains a **single failure domain**, not high availability; off-host backup and tested recovery are mandatory.

## 4. Capacity baseline and measurable gates

The existing Kubernetes YAML is **sizing evidence**, not observed consumption and not Compose limits to copy unchanged.

| Reference | CPU request / sum of limits | RAM request / sum of limits | Notes |
| --- | --- | --- | --- |
| [Staging Kubernetes services](../../k8s/beta/) | 1.60 / 4.80 vCPU | 4.875 / 9 GiB | PG, Nest, Angular, Tox21, Redis, NATS, edge Nginx |
| Same services hypothetically in production | 1.60 / 4.80 vCPU | 4.875 / 9 GiB | **Illustrative only**, tune for production workload |
| [Shared Meilisearch](../../k8s/core/meili-deploy.yaml) | 0.30 / 1.00 vCPU | 1.5 / 3 GiB | Real working set/page-cache pressure unknown |
| **Two environments + core** | **3.50 / 10.60 vCPU** | **11.25 / 21 GiB** | Excludes OS, Docker, filesystem cache, backups, cloudflared, viewer, RustDesk |

Requests and limits are not measured working-set demand. The [Kubernetes backup job](../../k8s/beta/pg-stack.yaml) has its **own 7 GiB request / 7.5 GiB limit** and must **not** be added blindly as an always-on service; redesign backup scheduling for the VPS.

### Storage planning assumptions (OPEN)

- Molecular Meilisearch data: approximately **55 GB**, one permanent copy.
- PostgreSQL/vector data and HNSW: working assumption **~23 GB per environment** for staging and production (**~46 GB total**) — confirm whether 23 GB is per copy or across both.
- Approximate combined data baseline: **~101 GB if 23 GB per DB**. Excludes WAL, restore staging area, temporary index work, images, OS, log growth, and backups.
- Kubernetes PVCs currently declare [70 GiB for Meilisearch](../../k8s/core/meili-pvc.yaml), [60 GiB for its staging/import volume](../../k8s/core/meili-staging-pvc.yaml), and [30 GiB per PG environment in beta](../../k8s/beta/pg-sts.yaml). These are capacity allocations, not actual consumption; clarify import-stage peak and remove transient volumes afterward.
- The candidate **640 GB SSD** provides plausible headroom, but verify available usable filesystem bytes, IOPS/latency, traffic policy, and external-backup costs before purchase.

### HNSW restore and OOM acceptance gate

The local [Docker PostgreSQL configuration](../../docker_sl/docker-compose.yml) uses `shared_buffers=4GB`, `maintenance_work_mem=4GB`, and `shm_size=4gb`; the Kubernetes [PG StatefulSet](../../k8s/beta/pg-sts.yaml) instead uses `shared_buffers=1GB`, `maintenance_work_mem=512MB`, and a **4 GiB container memory limit**. These different settings must **not** be interpreted as the actual minimum RAM requirement.

Before declaring the VPS sized correctly:

- [ ] Record exact PostgreSQL/pgvector versions, DB sizes, HNSW index definition, logical dump format, and whether the dataset is regenerated or restored.
- [ ] Reproduce restore with monitored cgroup memory, host available RAM, `/dev/shm`, swap activity, I/O, and elapsed time; distinguish cgroup OOM, host OOM, and shared-memory exhaustion.
- [ ] Compare **serial** logical restore (`pg_restore --jobs=1`) with bounded `maintenance_work_mem` and reduced HNSW maintenance parallelism; slower disk-backed construction is acceptable if safe and repeatable.
- [ ] Evaluate a **physical backup/restore** that preserves existing indexes, only after validating PostgreSQL major, extension version, platform, whole-cluster semantics, consistency and recoverability.
- [ ] Define temporary resource reservations / backup window so production is not starved by staging restore; test restoring one environment at a time.
- [ ] Record the selected method, peak RAM, available RAM margin, disk peak and time in this roadmap or an accompanying evidence/runbook file.

### Load / headroom acceptance gate

- [ ] Measure idle and realistic peak RAM/CPU by container and aggregate for core + small staging + production.
- [ ] Benchmark key flows: login, molecule search, vector similarity, Tox21 RPC, WebSocket, and a few concurrent clients.
- [ ] Include filesystem cache, PostgreSQL WAL, backups, RustDesk relay traffic, and host-reserve in the capacity report.
- [ ] Define alert thresholds and an upgrade trigger for RAM, storage, CPU steal/latency, and disk utilization. The candidate's shared vCore count is **not** a dedicated-core guarantee.
- [ ] Record the final staging/prod Compose resource limits **after** profiling; do not adopt the K8s maximum limits uncritically.

## 5. Shared Meilisearch, logs, and private viewer

The molecular indexes are effectively immutable, **not the entire Meilisearch instance**. Nest's application logs and security audits continue to write new JSON documents.

Current branch-specific source observations:

- [MeiliLoggerService](../../MercurionWebNode/src/app_modules/meilisearch/services/meili-logger.service.ts) emits outbox records targeting the fixed index `logs`.
- [SecurityAuditService](../../MercurionWebNode/src/app_modules/meilisearch/services/security-audit.service.ts) targets `security_logs`.
- [MeilisearchModule](../../MercurionWebNode/src/app_modules/meilisearch/meilisearch.module.ts) initializes the shared client with a configuration property named `Meilisearch.masterKey`.
- [Outbox dispatcher](../../MercurionWebNode/src/app_modules/notification/services/outbox/notification-outbox-dispatcher.service.ts) writes using the event's `indexName`; adapt the source of that name/credentials, not merely the viewer.

**Target index layout:** molecular indexes stay shared; use `logs_prod`, `logs_staging`, `security_logs_prod` and `security_logs_staging` (exact names to be validated). Provision per-index writer keys for each environment; separate molecular read/search keys from writable log/audit keys. Keep the Meilisearch master key strictly in provisioning/administration; never in browser UI or general-purpose runtime clients. Verify index-specific actions (`search`, `documents.get`, `documents.add`, task-status actions, etc.) against the actual SDK calls.

- [ ] Refactor hardcoded log/audit index names into environment-derived **trusted configuration**; test index separation and outbox retries.
- [ ] Separate Meilisearch clients/credentials by purpose (molecular read vs log/audit write); reject cross-environment and molecular-index writes from runtime identities.
- [ ] Configure `timestamp`, `level`, `context` and other appropriate log attributes as searchable/filterable/sortable based on actual schema. Review sensitive-data redaction.
- [ ] Set retention and controlled deletion for logs and security audits (separate policies), with disk-growth alerts. Do not assume the platform automatically expires documents.
- [ ] Choose/test a small open-source Meilisearch viewer with **table + JSON** document views (candidates: `riccox/meilisearch-ui`, `kaermorchen/meiliadmin`); pin a reviewed image/version rather than assuming a tag exists.
- [ ] Host **one** viewer privately alongside the core stack. Do not publish a viewer subdomain or the Meilisearch API. Provide read-only viewer credentials for log/audit indexes.
- [ ] Establish a **working SSH local port-forward path** without public SSH exposure. Determine whether the chosen Cloudflare SSH transport supports OpenSSH `-L`; do not assume all Access-for-Infrastructure modes support forwarding.
- [ ] If the viewer calls Meilisearch from the **browser**, forward the API port as well or put a same-origin restricted local proxy in front; validate CORS, credentials, and no data leakage.
- [ ] Test viewing and filtering staging/prod logs independently through `localhost` on the administrator workstation.

## 6. Phased execution plan

Each phase is a separate go/no-go checkpoint. Later work must not mark an earlier phase complete merely because containers start.

### INF-00 — Purchase and provision VPS | PLANNED

- [ ] Revalidate Netcup Lite 4 availability, price after Italian VAT, monthly commitment, network throttling policy, IPv4/IPv6, root/rescue console, snapshots, paid backups and resize options.
- [ ] Purchase **one** VPS only after accepting the budget and baseline limitations; retain invoice/contract details outside Git.
- [ ] Install **Debian 13 minimal** from provider image; record disk and filesystem layout and accessible provider rescue-console procedure.
- **Acceptance:** root console recovery is confirmed; a clean OS boots; no application ingress has been opened.

### INF-01 — Host administration and hardening | PLANNED

- [ ] Update OS; create non-root sudo administrator; enable SSH key auth; disable password/root SSH only after testing replacement access.
- [ ] Establish a **private or Cloudflare Access-protected SSH path** suitable for emergency administration and the later Meilisearch viewer forwarding. Keep provider console as independent recovery.
- [ ] Install/verify inbound deny-by-default provider + host firewall for IPv4 **and IPv6**; allow only documented outbound tunnel, update, registry, DNS and time traffic.
- [ ] Define unattended security patch policy, SSH/audit logs, disk alerts, time sync, and restoreable encrypted admin configuration.
- **Acceptance:** SSH recovery works through the chosen private path; direct unsolicited incoming application/SSH traffic is rejected; recovery console works.

### INF-02 — Docker Engine, Compose, storage and networks | PLANNED

- [ ] Install supported Docker Engine and Compose plugin; pin release/image policy and establish log rotation.
- [ ] Define Compose projects `mercurion-core`, `mercurion-staging`, `mercurion-prod`, `rustdesk` (last one reserved).
- [ ] Implement isolated frontend/backend networks, narrow Meilisearch sharing, non-public ports, least-privilege containers and distinct secrets/volumes.
- [ ] Mount persistent storage, establish disk usage metrics, and test restart/power-cycle behavior.
- **Acceptance:** explicit network isolation tests pass; no `0.0.0.0` / `[::]` host mappings for private application/database services.

### INF-03 — Cloudflare ingress and HTTP-only Nginx | PLANNED

- [ ] Configure production and staging hostnames, Tunnel identities, constrained connector networks and Cloudflare Access on staging **before public availability**.
- [ ] Adapt Nginx edge to internal port 80 only; move public TLS, Always Use HTTPS and HSTS ownership to Cloudflare.
- [ ] Verify external HTTPS semantics in NestJS, secure cookies, forwarded scheme/IP, OAuth callbacks, GraphQL and Socket.IO upgrades.
- [ ] From **an external network**, test direct IPv4/IPv6, port 80/443, and IP+Host/SNI attempts; no direct-origin bypass may succeed.
- **Acceptance:** both public names route correctly through Cloudflare; staging access requires authentication; all direct-origin web probes fail.

### INF-04 — Persistence and shared core data | PLANNED

- [ ] Deploy shared Meilisearch and its molecular index data once; do not overwrite its indexed corpus from staging jobs.
- [ ] Deploy separate staging and production PostgreSQL/pgvector, Redis and NATS with distinct volumes, secrets and backups.
- [ ] Run/record the HNSW restore comparison and chosen safe workflow (Section 4).
- [ ] Establish consistent, encrypted off-host PostgreSQL/core backup, retention, and **at least one demonstrated restore**.
- **Acceptance:** both environments have consistent, isolated data; shared molecular search works; restore can be repeated without OOM/data loss.

### INF-05 — Least-privilege logging and private diagnostics | PLANNED

- [ ] Implement/test the environment-specific Meilisearch log/audit indexes and restricted credentials.
- [ ] Deploy one private viewer and confirm SSH local forwarding for viewer and API (or an equivalent same-origin private proxy).
- [ ] Verify search/filter by timestamp, level, environment and context; test log/audit retention and disk alerts.
- **Acceptance:** staging cannot write production logs or molecular indexes; private logs are readable only through authorized administration.

### INF-06 — Low-load staging deployment | PLANNED

- [ ] Translate canonical runtime/deployment contract to Compose with **smaller staging CPU/RAM budgets**.
- [ ] Deploy stage-specific Angular/NestJS/Tox21/Nginx, health checks and tested config/secrets; preserve core contracts.
- [ ] Smoke-test auth, search, HNSW queries, scientific RPC, error pages, WebSocket and outgoing integrations.
- [ ] Keep staging behind Cloudflare Access; onboard only authorized beta testers.
- **Acceptance:** staging is stable and private; expected end-to-end flows succeed without starving shared services.

### INF-07 — Production release pipeline and launch | PLANNED

- [ ] Extend existing GitHub Actions CI to publish immutable, scanned/tagged container images; do not bypass existing tests/audit.
- [ ] Define reproducible deploy, secrets injection, health gates, migrations, backup-before-change and rollback strategy (DB migration rollback is separate from image rollback).
- [ ] Promote a validated staging artifact to production with explicit approval; configure public Cloudflare policies.
- [ ] Run external origin-bypass tests and load/smoke tests again after the production switch.
- **Acceptance:** versioned release is live only through Cloudflare, healthy, observable and rollback/recovery procedures are documented.

### INF-08 — Operations, recovery and sustained capacity | PLANNED

- [ ] Verify off-host backup schedule, restore drill, incident checklist, OS/container patch process, retention and alert routing.
- [ ] Track CPU steal, RAM/pressure/OOM, cache, HNSW maintenance performance, disk/IOPS, WAN throughput and TLS/tunnel errors.
- [ ] Record monthly actual spend and measured headroom; set specific conditions for upgrading the existing VPS rather than pre-buying more resources.
- **Acceptance:** documented recovery point/time targets and successful drill; no unmonitored capacity risks.

### INF-09 — RustDesk on the **same VPS** | PLANNED / TRANSPORT OPEN

- [ ] Reserve capacity, an isolated Compose project, keys/volumes, firewall policy and DNS naming **without** opening any RustDesk port at this stage.
- [ ] Evaluate OSS native ID/relay transport and the required TCP/UDP ports vs the strict all-inbound-closed policy. Verify whether supported WebSocket-only alternatives need Pro licenses or other client constraints; **do not assume** Cloudflare standard HTTP proxy transports arbitrary native RustDesk traffic.
- [ ] If native RustDesk ports are approved, expose only their specific transport ports via a DNS-only hostname and strict firewall isolation; **never** expose Mercurion's HTTP(S) ports. If zero direct inbound is absolute, prove a compatible alternate transport **on this VPS** before activation.
- [ ] Test Windows/macOS client onboarding, consent-driven support, relay/NAT behavior, bandwidth, logging, credential protection and no network pivot into Mercurion.
- [ ] Re-run IP, Host/SNI and IPv6 origin-bypass tests with RustDesk enabled.
- **Acceptance:** RustDesk works on the **existing VPS**, and Mercurion's Cloudflare-only ingress invariant still passes. No second VPS is introduced.

## 7. Explicit release blockers / open questions

| Gate | Reason | Resolution evidence required |
| --- | --- | --- |
| G-01 Restore memory | HNSW building previously caused OOM under constrained container memory. | Measured, repeatable restore without cgroup/host OOM. |
| G-02 Disk peak | Actual DB sizes, import staging and WAL peaks not yet verified. | Peak occupancy + safe free-space margin. |
| G-03 Staging capacity | Current K8s resource settings are not staging/prod real measurements. | Measured workload and finalized Compose budgets. |
| G-04 SSH private transport | The exact SSH access mode must support local `-L` forwarding. | Tested SSH login + forwarded viewer and API, no public SSH. |
| G-05 Meilisearch ACL | Existing runtime references a master-key property and fixed indexes. | Scoped per-index clients and cross-environment denial tests. |
| G-06 Ingress | Forwarded HTTPS/client-IP semantics, Cloudflare HSTS scope, Socket.IO, external bypass tests. | Recorded successful test suite. |
| G-07 Backup | One VPS is a single failure domain. | Off-host backup and successful clean restore. |
| G-08 RustDesk ingress | Native public ports conflict with an absolute ban on inbound connections to the VPS IP. | Explicit documented policy choice and tested same-host solution. |

## 8. Evidence and revision register

For every completed phase, record at least: date, operator, relevant commit/config revision, tested command or procedure, outcome, and any deviation. Keep sensitive output and credentials out of Git. Proposed evidence home: a future `docs/infrastructure/evidence/` directory or links to retained internal runbooks; **do not** create evidence scaffolding until needed.

| Version | Date | Change | Status |
| --- | --- | --- | --- |
| 0.1.0 | 2026-10-25 | Initial roadmap: one-VPS topology, Cloudflare-only Mercurion ingress, capacity/HNSW gates, shared Meilisearch logging/viewer, staging/prod rollout, and future same-VPS RustDesk. | Planning |

### Repository references

- [Canonical deployment contract](../../deployment/deployment-schema.json) and [production overlay](../../deployment/overlays/production.json)
- [Existing beta manifests](../../k8s/beta/) and [core manifests](../../k8s/core/)
- [Local Docker dependencies](../../docker_sl/docker-compose.yml)
- [Repository overview and CI interface](../../readme.md)
- [Application observability policy](../observability-performance-policy.md)

**Change control:** this roadmap expresses planned infrastructure work only. Updating it does not authorize purchasing services, modifying secrets, changing deployment configs or deploying production. Those actions require their own reviewed execution step.
