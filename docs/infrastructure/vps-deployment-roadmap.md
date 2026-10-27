# Mercurion VPS infrastructure & deployment roadmap

> **Version:** 0.3.4 (local JWT adapter and explicit development bootstrap)
> **Updated:** 2026-10-27
> **Status:** PLANNING — no VPS purchase, provisioning, migration, or production deployment is recorded by this document.  
> **Repository branch at creation:** `bugfix/6abfd27de7c18baf04198c71-technical-debt-recovery-2`  
> **Ownership:** human-led infrastructure planning; execution and acceptance require explicit review.

## 1. Purpose, boundaries, and working method

This is the **infrastructure roadmap**, deliberately separate from the repository's application/product roadmap (`roadmap.md`). It covers VPS procurement, operating system, network security, **runtime configuration/secret management**, Docker Compose deployment, data migration, operational tooling, staging/production rollout, and later RustDesk integration. It is **not** an autonomous task recipe, a deployment runbook, or a claim that any step has been completed.

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
| D-12 | **Staging and production must obtain runtime configuration/secrets without persistent `.env`, plaintext `.pem`, or secrets baked into images/repository/Compose metadata.** RSA JWT private/public keys are Base64-encoded inputs and decoded in application memory. | Security invariant; mechanism OPEN |
| D-13 | **External hosted Free-tier Secret Manager** is the leading approach: **Infisical** (promising for multi-environment identities) and **Bitwarden Secrets Manager** (viable alternative). Target **€0/month incremental recurring cost**; exclude Google Cloud Secret Manager from this evaluation. | Exploratory, provider not selected |
| D-14 | Preserve autonomous recovery after reboot **only if machine identity/bootstrap can be secured**; if strict zero persistent credential material is required, evaluate operator-unlock or provable hardware/federated identity instead of claiming automatic bootstrap. | OPEN |

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

External secrets control plane (not a second VPS):
  hosted Free-tier Infisical or Bitwarden Secrets Manager, candidate TBD
  -> authenticated, environment-scoped runtime retrieval and validation
  -> no persistent production/staging dotenv, PEM files, or image-baked credentials

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

### Runtime configuration and secret management (EXPLORATORY)

**Contract:** local `development` and local `test` may load file-based dotenv and local PEM material; `staging` and `production` must receive their configuration **at runtime**. Do not place production/staging `.env` files, raw `.pem` key files, tokens, application passwords, or decrypted secret snapshots in persistent VPS storage, Git, CI artifacts, container images, shell history, log output, or Compose YAML. Treat public/nonsecret configuration separately from confidential values but resolve both through the deliberate runtime-configuration mechanism. **Base64 is an encoding, not encryption.**

The current application already implements part of this contract:

- [ConfigurationModule](../../MercurionWebNode/src/config/configuration.module.ts) sets `ignoreEnvFile` outside local development/test; [environment helpers](../../MercurionWebNode/src/utils/env-helpers.ts) explicitly restrict dotenv loading to those two environments.
- [JwtKeysProvider](../../MercurionWebNode/src/app_modules/auth/providers/jwt-keys.provider.ts) decodes `JWT_RS256_PRIVATE_KEY_B64`, `JWT_RS256_PUBLIC_KEY_B64`, `JWT_WS_RS256_PRIVATE_KEY_B64` and `JWT_WS_RS256_PUBLIC_KEY_B64` to PEM strings **in memory** for production/staging. It currently also accepts raw-PEM env fallbacks; **remove that prod-like fallback** when enforcing the stricter contract, without breaking local file-based development/test behavior.
- [Configuration schema](../../MercurionWebNode/src/config/config.schema.ts) must be extended to declare/validate the four RSA `_B64` values for prod-like deployments, including Base64 decoding, expected PEM type and keypair coherence; currently `JwtKeysProvider` can look up names not represented in the canonical validated schema. Confirm the values remain available if using the explicit `ConfigurationModuleOptions.environment` injection path rather than `process.env`.
- `createApplicationModule({ configuration: { environment: ... } })` already allows supplying a raw environment map to the canonical validation flow, but **asynchronous external retrieval before NestJS bootstrap requires implementation/validation**; no provider integration exists yet.
- Additional long-lived crypto secrets (e.g., `APP_AES_SECRET`, `APP_USER_ID_AES_ENCRYPTION_SECRET`, session, HMAC, cookie, OAuth2 credential-encryption roots) need recovery/rotation procedures; careless rotation may invalidate existing tokens or make stored encrypted data unreadable.

**Candidate comparison — planning snapshot, revalidate at decision time:**

| Hosted candidate | Free-tier snapshot | Why explore it | Blockers to test |
| --- | --- | --- | --- |
| [Infisical](https://infisical.com/pricing) | `$0`; currently **5 total human+machine identities**, unlimited projects and **3 environments per project** | Promising structured environments and machine identities, likely extensible for future backends | Verify Free-tier project/environment-level *effective* access isolation, permitted auth methods, API/SDK availability and rate limits. Advanced **Access Controls** are listed on paid plans: do **not** assume fine-grained policy capabilities in Free. |
| [Bitwarden Secrets Manager](https://bitwarden.com/help/secrets-manager-plans/) | `$0`; currently **2 users, 3 projects, 3 machine accounts**, unlimited stored secrets | Straightforward machine-account/project model and JavaScript SDK/CLI | Three machine accounts are a tight ceiling for core+staging+prod if deployment/CI, RustDesk or extra services require separate identities; verify least-privilege isolation, token lifecycle and runtime client compatibility. |

**Neither provider is approved yet.** Prefer a short **Infisical-first proof of concept** because of the stated interest in future environment/service growth, with **Bitwarden as a fully valid fallback**, and select from evidence rather than vendor preference. No Google Cloud Secret Manager or new paid SaaS subscription is in scope. Both candidates are external hosted control planes **without another VPS**; do not add an embedded Vault/Infisical/Bitwarden server to the application VPS by default. Free-tier availability, terms and limits can change; actual cost cannot be guaranteed indefinitely.

**Deployment and threat-model constraints:**

1. **Do not substitute Docker `environment:` interpolation for secure injection.** Values passed as Docker container environment variables can be revealed by Docker metadata/`docker inspect` to privileged administrators and can persist in Docker state, even when no dotenv file is present. No RSA keys, DB passwords or provider tokens in ordinary Compose environment, labels, build args, command lines or image layers.
2. Standalone Compose `secrets` are exposed as **files** (`/run/secrets/...`), with `file` or `environment` sources; they are **not equivalent to a fully managed encrypted Swarm secret store**. A RAM-backed `tmpfs` handoff might avoid persistent disk but still violates a literal "**no files at all**" policy. Decide explicitly whether ephemeral RAM-only secret files are permitted for third-party services; do not silently weaken the requirement.
3. **NestJS preferred path:** obtain secrets using an authenticated SDK/API during application startup (before validated `ConfigService` initialization), keep secret material in process memory, preserve staging/production separation, and fail closed on missing/invalid values. This avoids writing app secrets to Compose metadata and avoids on-disk PEM creation. A startup dependency on the external provider must be monitored and rehearsed.
4. **Other processes require their own solution:** PostgreSQL entrypoint/DB credentials, Redis, Meilisearch, `cloudflared` Tunnel credentials, and later RustDesk may not support the same in-process SDK flow. Evaluate native provider auth, a privileged launcher, IPC or RAM-only mounts **per service**; validate persistence/inspect/log exposure and reboot behavior. Never assume a NestJS integration secures the entire stack.
5. **Machine identity bootstrap remains unresolved:** Bitwarden machine access tokens and Infisical Universal Auth client secrets are themselves credentials. GitHub Actions OIDC (where available) identifies a workflow, **not automatically the running unmanaged VPS**. Define how the VPS gains/re-gains a restricted identity after reboot without storing a recoverable plaintext token on disk; explicitly assess **protected/encrypted host bootstrap material vs operator unlock vs provider-supported attestation/federation**. A static long-lived token in Compose or `systemd` unit files is not an acceptable substitute.
6. **Security boundary:** possession of root/Docker-admin rights or a compromised live process may expose secrets held in memory. Secret Manager use reduces uncontrolled persistence, accidental leaks and cross-environment blast radius; it does **not** make a compromised root host trustworthy. Limit identity scopes and administrative access; design token revocation and incident recovery.
7. **Rotation and recovery:** distinguish signing-key overlap/verification from revoking active JWTs; plan separate access/WS keypairs and staging/prod identities. Preserve necessary decryption keys for encrypted historical data; record secret names/owners and rotation procedures **without recording values**.
8. **CI/CD:** build images **without** production secrets, pass only short-lived deployment identity where possible, and let each workload retrieve its own scoped runtime secrets. Ensure `docker inspect`, `docker compose config`, logs, crash reports and runtime debug endpoints cannot inadvertently disclose them.

**Acceptance experiment:** create synthetic (never real) RSA access/WS keys and representative database/API credentials in the candidate provider; retrieve via an identity limited to staging; inject into an isolated NestJS test bootstrap; verify Base64 decode, schema validation, `JwtKeysProvider` behavior, failed cross-environment reads, Docker inspection, zero persistence after restart, a rotation/revocation drill, and clean host reboot/recovery. Repeat/extend for production and non-Nest services before authorizing actual deployment. Record limitations and comparative results; do not commit tokens or test secret values.

**Official reference points:** [Infisical pricing](https://infisical.com/pricing), [Infisical machine identities](https://infisical.com/blog/introducing-machine-identities), [Bitwarden plans](https://bitwarden.com/help/secrets-manager-plans/), [Bitwarden machine accounts](https://bitwarden.com/help/machine-accounts/), [Docker Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/).

### JWT key rotation coordination (AUTH-02 / 16K)

Coordinate INF-01A with the application [JWT rotation plan](../../MercurionWebNg/docs/portfolio-ux/JWT-KEY-ROTATION.md) and [analysis](../../MercurionWebNg/docs/portfolio-ux/JWT-KEY-ROTATION-ANALYSIS.md). The user approved a persistent **nonsecret manifest** on a volume, atomic administrative CLI updates, hot revocation and removal from private rooms/disconnection of affected WebSockets within **5 seconds**. One NestJS and one Tox21 instance per environment are planned. Application implementation has local synthetic evidence; deployment acceptance remains open.

**Application progress (2026-10-25):** B1a/B1b implement schema, source ports, memory-only material validation/cache and multi-key signing/verification through explicit application composition. Startup validates configured material; state is rechecked before/after each operation. Local synthetic validation: 17 suites/271 tests. The normal bootstrap still uses existing configuration and keys. This is not INF-01A acceptance: no real provider adapter, pre-bootstrap secret retrieval, canonical configuration migration, persistent manifest reader/CLI or inactive-WebSocket 5-second revocation proof yet. Details and limits: [runtime contract](../../MercurionWebNode/docs/jwt-key-manifest.md).

**B2 progress (2026-10-27):** persistent current/history directories, immutable revision chain/tombstones, expected-revision writer lock, atomic publication, explicit forward recovery and metadata-only CLI are implemented locally. Verified private sockets are reconciled without provider calls; local real-file/real-timer fixture evicted an idle connection in 1016 ms during provider outage. Validation: 19 suites/301 tests. [Operations and limits](../../MercurionWebNode/docs/jwt-key-operations.md). Production requires readonly mounts and writer ACLs, separate history retention during backup/restore, Linux fsync/Compose/WS acceptance, and the real INF-01A adapter/bootstrap. The standalone CLI applies revoke/retire without the manager; prepare/activate application requires a trusted in-memory materialSource and does not simulate provider availability. No deployment or real key rotation performed.

**Local development update (2026-10-27):** the local material adapter, controlled legacy import and `JWT_LOCAL_KEYS_CONFIG` opt-in bootstrap are implemented in review. The dedicated local HMAC dotenv is parsed privately; legacy `.env`/PEM input is preserved, and no real user material was migrated. See [development procedure](../../MercurionWebNode/docs/jwt-local-development.md). Standalone administration can prepare/activate through `--local-config` in development/test only. Latest isolated Linux QA: 27 checks, including local migration/rotation in tmpfs; idle WS revoked in 543 ms. This does not satisfy INF-01A provider selection, machine identity, secret-free pre-bootstrap configuration or deployment acceptance. The local flag is rejected in staging/production.

**Isolated Linux/Compose QA (2026-10-27):** [26 integration checks passed](../../MercurionWebNode/docs/jwt-linux-qa.md) on the public Node 22.16.0 base with current dependency versions: real Redis sessions/Socket.IO Redis adapter, separate UIDs, readonly/POSIX write rejection, ordinary HTTP/WS rotation, HS512 revocation, provider outage, process restart and actual writer SIGKILL between durable audit publication and current replacement. Idle WS eviction measured 697 ms in the final run. Task-owned containers/network/volumes/image removed. This closes the isolated Linux fixture gate, not INF-01A provider/machine identity or final VPS/full-bootstrap acceptance. [Environment/secret/kid contract](../../MercurionWebNode/docs/jwt-environment-and-secrets.md): ordinary development remains unchanged, kid/state belong to the nonsecret manifest, secret material is retrieved in memory by the future adapter; canonical configuration/process.env migration remains open.

- **Two separate authorities:** Secret Manager owns confidential material; the local manifest owns JWT key admission/revocation, active kid and legacy windows. Keep private RSA/HMAC, manager credentials and decrypted snapshots out of the manifest, its history and CLI logs. Public verification keys and noncredential references may persist there.
- In staging/production retrieve material into process memory through a provider-independent asynchronous boundary. No persistent secret directory/PEM or Compose environment substitute. Keep local development/test file behavior separate. Bind each environment/purpose/kid to a deliberate immutable version or distinct logical secret entry; verify actual version/isolation support in the selected provider rather than assuming Free-tier capabilities.
- **Startup and live changes differ:** retrieve/validate canonical application configuration before Nest bootstrap; prepare and validate new key material before activating its kid. Removing a provider secret or revoking its machine identity does not revoke JWTs signed by an already cached key: update the local revocation manifest explicitly. Do not make the local revocation/WS deadline wait on a provider SDK request.
- **Outage contract:** cold start without required valid configuration/material fails closed. A running process may use already loaded material only while the fresh local manifest permits it; missing new material fails without fallback. No decrypted disk cache for restart. Prove revocation and the WS bound while the external provider is unavailable.
- Audit the current Nest configuration integration: installed ConfigModule.forRoot copies validated values into process.env. Supplying ConfigurationModuleOptions.environment alone is not proof of DI-only handling. Inspect/correct inheritance into child processes, SDK disk caches and debug/crash/log exposure; process-local environment and Docker creation metadata are distinct surfaces.
- Tox21 needs only public HTTP verification material from the manifest for JWT validation. Its other runtime credentials still need the per-service INF-01A solution. Its existing authentication bypass/public scientific RPC contract remains a separate application decision; do not flip that behavior as an infrastructure side effect.
- **Delivery boundary:** 16K-B1 can implement manifest/schema, material-source boundary and signing/verification using synthetic fixtures before vendor selection. The real provider adapter, machine bootstrap, isolation, no-persistence and reboot/outage acceptance remain INF-01A gates before staging/production. The application's 4–6-day JWT-core estimate excludes this provider/bootstrap PoC and integration effort.

This coordination does not select Infisical/Bitwarden or approve an identity-bootstrap mechanism. VPS INF-01A is unrelated to the deferred portfolio INF-01 / R2 work.

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
- [ ] Establish the trust boundary and recovery procedure for later Secret Manager machine-identity bootstrap; do not place credentials in systemd units or shell history.
- **Acceptance:** SSH recovery works through the chosen private path; direct unsolicited incoming application/SSH traffic is rejected; recovery console works.

### INF-01A — Runtime configuration and Secret Manager proof of concept | OPEN

This is a **new exploratory checkpoint inserted without renumbering INF-02 through INF-09**. It must pass before deploying any real staging/production credentials.

- [ ] Inventory **all** runtime variables by service/environment, mark secret vs nonsecret, identify consumers, required formats and recovery/rotation owners using [the configuration reference](../configuration.md) and canonical schema.
- [ ] Compare hosted **Infisical Free** and **Bitwarden Secrets Manager Free** on current cost/terms, project and machine identities, effective Free-tier isolation, API/SDK support and room for RustDesk/future small services. **Exclude Google Cloud Secret Manager.**
- [ ] Run an **Infisical-first sandbox PoC**, then Bitwarden if capability/cost/security trade-offs warrant it. No live production keys in experiments.
- [ ] Design a secure **post-reboot identity bootstrap**: make an explicit choice between acceptable protected host identity material, an operator-unlock procedure, or a supported nonpersistent attested/federated method. Record any downtime/availability trade-off.
- [ ] Implement/test asynchronous runtime retrieval and canonical schema validation for NestJS; enforce four RSA `_B64` key entries in staging/prod, removing raw PEM fallback there while preserving local file-based development/test.
- [ ] Validate the AUTH-02 material-source boundary and immutable kid bindings; prove that the nonsecret manifest drives hot revocation/WS disconnection within 5 seconds even during provider outage, with no secret snapshots on its volume. Review ConfigModule process.env copying and child-process/SDK-cache exposure.
- [ ] Confirm credentials never appear in Docker `environment:` values/`docker inspect`, persisted dotenv/PEM, image layers, process arguments, CI artifacts or logs; separately evaluate `/proc` and root privilege exposure.
- [ ] Prove compatible injection/secret retrieval for PostgreSQL, Redis, Meilisearch, `cloudflared` and later RustDesk, including whether RAM-only file mounts are an **explicitly approved exception** or forbidden.
- [ ] Run credential isolation, invalid-base64 fail-closed, reboot/restart, manager outage, revocation/rotation and recovery tests using synthetic secrets.
- [ ] Record provider selection (or `BLOCKED` state), decision rationale, exact pricing limits, residual risks and tested operational runbook.
- **Acceptance:** documented, executable zero-additional-subscription approach demonstrates environment isolation, no forbidden persistent secrets, correct RSA key handling and a deliberately chosen automatic-vs-manual restart trade-off. **No purchase or deployment authorization is implied.**

### INF-02 — Docker Engine, Compose, storage and networks | PLANNED

- [ ] Install supported Docker Engine and Compose plugin; pin release/image policy and establish log rotation.
- [ ] Define Compose projects `mercurion-core`, `mercurion-staging`, `mercurion-prod`, `rustdesk` (last one reserved).
- [ ] Implement isolated frontend/backend networks, narrow Meilisearch sharing, non-public ports, least-privilege containers and distinct runtime credentials/volumes following INF-01A; **never** assume Compose interpolated environment secrets are protected.
- [ ] Mount persistent storage, establish disk usage metrics, and test restart/power-cycle behavior.
- **Acceptance:** explicit network isolation tests pass; no `0.0.0.0` / `[::]` host mappings for private application/database services.

### INF-03 — Cloudflare ingress and HTTP-only Nginx | PLANNED

- [ ] Configure production and staging hostnames, Tunnel identities, constrained connector networks and Cloudflare Access on staging **before public availability**; retrieve connector credentials through the validated runtime-secret flow.
- [ ] Adapt Nginx edge to internal port 80 only; move public TLS, Always Use HTTPS and HSTS ownership to Cloudflare.
- [ ] Verify external HTTPS semantics in NestJS, secure cookies, forwarded scheme/IP, OAuth callbacks, GraphQL and Socket.IO upgrades.
- [ ] From **an external network**, test direct IPv4/IPv6, port 80/443, and IP+Host/SNI attempts; no direct-origin bypass may succeed.
- **Acceptance:** both public names route correctly through Cloudflare; staging access requires authentication; all direct-origin web probes fail.

### INF-04 — Persistence and shared core data | PLANNED

- [ ] Deploy shared Meilisearch and its molecular index data once; do not overwrite its indexed corpus from staging jobs.
- [ ] Deploy separate staging and production PostgreSQL/pgvector, Redis and NATS with distinct volumes, runtime-fetched secrets and backups; verify how non-Nest services consume secrets without forbidden persisted files or Docker metadata.
- [ ] Run/record the HNSW restore comparison and chosen safe workflow (Section 4).
- [ ] Establish consistent, encrypted off-host PostgreSQL/core backup, retention, and **at least one demonstrated restore**.
- **Acceptance:** both environments have consistent, isolated data; shared molecular search works; restore can be repeated without OOM/data loss.

### INF-05 — Least-privilege logging and private diagnostics | PLANNED

- [ ] Implement/test the environment-specific Meilisearch log/audit indexes and restricted credentials delivered through INF-01A; do not provide the master key to generic runtime clients.
- [ ] Deploy one private viewer and confirm SSH local forwarding for viewer and API (or an equivalent same-origin private proxy).
- [ ] Verify search/filter by timestamp, level, environment and context; test log/audit retention and disk alerts.
- **Acceptance:** staging cannot write production logs or molecular indexes; private logs are readable only through authorized administration.

### INF-06 — Low-load staging deployment | PLANNED

- [ ] Translate canonical runtime/deployment contract to Compose with **smaller staging CPU/RAM budgets**.
- [ ] Deploy stage-specific Angular/NestJS/Tox21/Nginx, health checks and **runtime-fetched** configuration/secrets; verify Base64 access/WS RSA keys and preserve core contracts.
- [ ] Smoke-test auth, search, HNSW queries, scientific RPC, error pages, WebSocket and outgoing integrations.
- [ ] Keep staging behind Cloudflare Access; onboard only authorized beta testers.
- **Acceptance:** staging is stable and private; expected end-to-end flows succeed without starving shared services.

### INF-07 — Production release pipeline and launch | PLANNED

- [ ] Extend existing GitHub Actions CI to publish immutable, scanned/tagged container images; do not bypass existing tests/audit.
- [ ] Define reproducible deploy, **Secret Manager-backed runtime retrieval (not secrets baked into CI artifacts/Compose metadata)**, health gates, migrations, backup-before-change and rollback strategy (DB migration rollback is separate from image rollback).
- [ ] Promote a validated staging artifact to production with explicit approval; configure public Cloudflare policies.
- [ ] Run external origin-bypass tests and load/smoke tests again after the production switch.
- **Acceptance:** versioned release is live only through Cloudflare, healthy, observable and rollback/recovery procedures are documented.

### INF-08 — Operations, recovery and sustained capacity | PLANNED

- [ ] Verify off-host backup schedule, restore drill, incident checklist, OS/container patch process, retention and alert routing; include Secret Manager outages, identity revocation, rotation, and secure restoration of required decryption roots.
- [ ] Track CPU steal, RAM/pressure/OOM, cache, HNSW maintenance performance, disk/IOPS, WAN throughput and TLS/tunnel errors.
- [ ] Record monthly actual spend and measured headroom; set specific conditions for upgrading the existing VPS rather than pre-buying more resources.
- **Acceptance:** documented recovery point/time targets and successful drill; no unmonitored capacity risks.

### INF-09 — RustDesk on the **same VPS** | PLANNED / TRANSPORT OPEN

- [ ] Reserve capacity, an isolated Compose project, keys/volumes, firewall policy and DNS naming **without** opening any RustDesk port at this stage; keep RustDesk's runtime-secret identity independent from Mercurion.
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
| G-09 Free-tier secrets provider | Plan limits, machine identity count, access scopes and cost for prod/staging/core/future services unconfirmed in practice. | Infisical-vs-Bitwarden PoC, effective ACL denial tests, current terms and selected cost-neutral plan. |
| G-10 Identity bootstrap / recovery | An unmanaged VPS does not automatically have a managed-cloud workload identity; auto-restart with absolutely no persistent bootstrap credentials is not assured. | Explicit bootstrap trust model, compromise/rotation policy and tested reboot/manager outage recovery. |
| G-11 Runtime secret transport | Compose env interpolation exposes secret values through Docker metadata; Compose secrets use file mounts, contrary to a strict no-files policy. | Test demonstrates no forbidden persistence/inspect exposure for **every** service; document any explicitly approved RAM-only exception. |
| G-12 RSA key/schema contract | Prod-like provider supports Base64 and raw-PEM fallbacks but schema does not declare the four `_B64` key names. | Canonical validation + keypair tests with secret-provider input; prod/staging fail closed without valid Base64 pairs. |

## 8. Evidence and revision register

For every completed phase, record at least: date, operator, relevant commit/config revision, tested command or procedure, outcome, and any deviation. Keep sensitive output and credentials out of Git. Proposed evidence home: a future `docs/infrastructure/evidence/` directory or links to retained internal runbooks; **do not** create evidence scaffolding until needed.

| Version | Date | Change | Status |
| --- | --- | --- | --- |
| 0.1.0 | 2026-10-25 | Initial roadmap: one-VPS topology, Cloudflare-only Mercurion ingress, capacity/HNSW gates, shared Meilisearch logging/viewer, staging/prod rollout, and future same-VPS RustDesk. | Planning |
| 0.2.0 | 2026-10-25 | Exploratory Free-tier Secret Manager design: Infisical vs Bitwarden, runtime-only staging/prod config, Base64 RSA contract, INF-01A, identity bootstrap, non-Nest secret transport, and new release gates. Google Cloud excluded. | Planning |
| 0.3.0 | 2026-10-25 | Coordinate AUTH-02 hot JWT rotation with INF-01A: nonsecret manifest vs in-memory secret material, provider-independent B1 boundary, outage/revocation/WS acceptance and ConfigModule environment-copy audit. Provider and machine-bootstrap choices remain open. | Planning |
| 0.3.1 | 2026-10-25 | Record synthetic B1a/B1b implementation and explicit-composition boundary; preserve INF-01A real-provider/bootstrap gates and B2 persistent-manifest/WS work. | Application implementation in review; infrastructure gates open |
| 0.3.2 | 2026-10-27 | Record local B2 registry/CLI/idle-WS implementation, forward-recovery trust boundary, synthetic measurements and remaining Linux/Compose/provider gates. | Local implementation in review; deployment acceptance open |
| 0.3.3 | 2026-10-27 | Record successful isolated Linux/Compose QA, reproducible public-base runner, cleanup and env/secret/kid contract. Provider/bootstrap and final VPS acceptance remain open. | Isolated QA in review; INF-01A open |

| 0.3.4 | 2026-10-27 | Record local adapter, controlled migration and development/test opt-in bootstrap; preserve INF-01A provider and machine-identity gates. | Local implementation in review; no real activation |

### Repository references

- [Canonical deployment contract](../../deployment/deployment-schema.json) and [production overlay](../../deployment/overlays/production.json)
- [Existing beta manifests](../../k8s/beta/) and [core manifests](../../k8s/core/)
- [Local Docker dependencies](../../docker_sl/docker-compose.yml)
- [Repository overview and CI interface](../../readme.md)
- [Application observability policy](../observability-performance-policy.md)
- [Environment schema and validation](../../MercurionWebNode/src/config/config.schema.ts)
- [Runtime configuration module](../../MercurionWebNode/src/config/configuration.module.ts)
- [RSA JWT keys provider](../../MercurionWebNode/src/app_modules/auth/providers/jwt-keys.provider.ts)

**Change control:** this roadmap expresses planned infrastructure work only. Updating it does not authorize purchasing services, modifying secrets, changing deployment configs or deploying production. Those actions require their own reviewed execution step.
