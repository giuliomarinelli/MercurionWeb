# Mercurion Code Red — overweek autonomous full-Series launch v6

Use this file only after this launch manifest, its session configuration, and
the dedicated real test-account login policy are integrated into `develop`; the
exact resulting `develop` SHA must have a successful fresh full GitHub Actions
`Required gate`. The dedicated non-production browser profile must be available, but no
profile-persistence or pre-authenticated-state probe is a launch prerequisite:
every worker establishes its own fresh real-account login.

The immutable session configuration is:

```text
docs/autonomous-development/session.overweek-2026-09-20-v6.yaml
```

The coordinator must refuse a new launch at or after
`2026-09-20T10:00:00+02:00` (Europe/Rome, CEST), dieci giorni dopo la
preparazione del launch.

Task `0041` (`FE-019`) is already integrated as `DONE`. A restarted session
must not attempt or re-enable it; task selection resumes exclusively from the
current authoritative planner snapshot.

## Host preflight (PowerShell 7, repository root)

```powershell
git fetch --prune origin
if ($LASTEXITCODE -ne 0) { throw "git fetch fallito." }

git switch develop
if ($LASTEXITCODE -ne 0) { throw "git switch develop fallito." }

git pull --ff-only origin develop
if ($LASTEXITCODE -ne 0) { throw "develop non aggiornabile fast-forward." }

$Dirty = git status --short
if ($Dirty) { throw "Working tree non pulito:`n$Dirty" }

$LocalDevelop = (git rev-parse HEAD).Trim()
$RemoteDevelop = (git rev-parse origin/develop).Trim()
if ($LocalDevelop -ne $RemoteDevelop) {
  throw "develop locale e origin/develop non coincidono."
}

if ((node --version).Trim() -ne "v22.16.0") {
  throw "È richiesto Node v22.16.0."
}

if ((npm --version).Trim() -ne "10.9.2") {
  throw "È richiesto npm 10.9.2."
}

if ((git config --local --get commit.gpgSign).Trim() -ne "false") {
  throw "Impostare commit.gpgSign=false nella configurazione locale della repo."
}

npm run autonomous:plan
if ($LASTEXITCODE -ne 0) { throw "planner delle dipendenze fallito." }

git diff --check
if ($LASTEXITCODE -ne 0) { throw "git diff --check fallito." }

$Dirty = git status --short
if ($Dirty) { throw "Il preflight ha modificato il working tree:`n$Dirty" }
```

In GitHub verifica che lo stesso `$LocalDevelop` SHA abbia una run `full`
recente e riuscita con Windows, Linux e `Required gate`. Una run `metadata` o
`duplicate` non basta per iniziare la sessione.

Non eseguire localmente `npm ci` o `npm run ci:check`: installazione pulita e
gate completo sono responsabilità della pipeline Actions sugli SHA esatti.

## Start Copilot CLI

```powershell
copilot --agent development-session-coordinator --allow-all-tools --allow-all-urls --add-dir ../MercurionTox21 --reasoning-effort high --autopilot
```

Mantieni la selezione modello su `Auto`; il YAML non deve pinzare modello o
reasoning dei worker.

## Inside Copilot CLI

Prima di incollare il prompt esegui:

```text
/model
/permissions show
/mcp list
/keep-alive on
```

Conferma coordinator attivo, Auto attivo, permessi repository/rete disponibili,
Chrome DevTools MCP elencato e keep-alive abilitato. Il browser deve usare solo
il profilo dedicato non-production, mai Incognito, Guest o il profilo personale.
Per i task che richiedono l'area riservata, ogni worker deve leggere le
credenziali condivise dal file git-ignored
`MercurionWebNode/env/.env.development`, eseguire un login ordinario da
`http://localhost:8888/login` e provare una sessione accettata dal server. Non
deve usare la route dummy-auth deprecata né dipendere dalla sessione conservata
nel profilo Chrome.

## Launch prompt

```text
Run the bounded autonomous Mercurion development session defined by
docs/autonomous-development/session.overweek-2026-09-20-v6.yaml.

Read the complete active configuration, AGENTS.md,
docs/autonomous-development/PROTOCOL.md,
docs/autonomous-development/RUNTIME.md, and
docs/autonomous-development/CI-BASELINE.md before any repository write.

Never run `npm ci` or `npm run ci:check` locally. Use the required exact-SHA
GitHub Actions runs for clean-install and complete-gate evidence, and run only
focused local validation that reuses the existing dependency tree.

Perform every configured startup and capability probe. Refuse launch at or
after 2026-09-20T10:00:00+02:00. Require a clean, synchronized develop and a
successful fresh full GitHub Actions Required gate for its exact SHA. Confirm
the dedicated persistent non-production browser profile is available for
browser isolation without opening an application URL. Before runtime startup,
do not issue any HTTP request or edge-liveness probe, including requests made
with Invoke-WebRequest, curl, fetch, or Chrome. Start Tox21, Nest and Angular
in that order and record live handles for all three long-running execution
sessions before the first HTTP request. Only after that barrier, treat any HTTP
response from http://localhost:8888 as proof that nginx itself is reachable:
its default 502 means a started but not-yet-ready task-scoped upstream, while
ECONNREFUSED on port 8888 means the edge is down. Never use `require.resolve`,
dynamic imports or package-manifest resolution as a dependency-readiness gate.
A 502/503 after startup is retryable for the full five-minute build window
while the processes remain alive; it is not a capability pause. Require two
consecutive complete successful readiness rounds. For every task requiring the
reserved area, read the shared
credentials from the git-ignored MercurionWebNode/env/.env.development file,
perform a fresh ordinary login through http://localhost:8888/login, and prove
that a protected server endpoint accepts the resulting real session before
implementation. Never use the deprecated dummy-auth route or rely on a session
persisted by an earlier worker. A missing or rejected test-account session is
SESSION_CAPABILITY_PAUSE and must not mutate task outcomes or propagate skips.
Record that task in a session-local exclusion set and continue with the next
independent READY task; never retry the same paused task in this session.

Before task selection run `npm run autonomous:plan`. Treat its versioned JSON
as the sole dependency authority; fail closed on malformed recipes, missing
hard dependencies, cycles, stale terminal skips, or planner errors.

The configured `workload.tasks` list is empty, so the complete Series is in
scope: there is no autonomous allowlist. Select the earliest filename-ordered
READY task from the authoritative planner output; the expected first READY task
is 0054. Continue serially through eligible tasks until the soft deadline or
genuine workload exhaustion. No error, denial, branch collision, CI-observation
failure, baseline incident, or unavailable capability may finalize the session
early while configured pending work remains. Isolate one-task failures, skip a
colliding branch for the current scheduling pass, and use
`SESSION_RECOVERY_PENDING` for unsafe shared-state failures.

Tasks through 0053 that are marked `DONE` are terminal; never select them again.
Select task 0054 first, then continue with the next independent READY task from
each fresh planner snapshot. When a selected task requires authenticated browser evidence,
proceed only after a fresh ordinary login with the shared real test account has
established a protected server-accepted session. Otherwise apply
`SESSION_CAPABILITY_PAUSE` without mutating the task or propagating dependency
skips, then continue with the next independent READY task outside the
session-local pause set. Finalize for capability exhaustion only when no such
task remains.

Execute exactly one recipe per fresh synchronous development-task-worker. Do
not bundle tasks. Create each feature branch locally, publish it only after a
task-specific commit exists, require exact feature-SHA CI before a no-ff
no-GPG-sign merge, then require exact merge-SHA CI before continuing.
When exact feature-SHA CI reports an actionable repository-controlled failure,
keep the task in CI_PENDING and invoke a fresh synchronous CI-repair worker for
the same recipe and branch. Supply the exact failed SHA/run/job evidence,
commit and push the narrow correction, and retry exact-SHA CI up to three
times. Do not mark BLOCKED on the first actionable CI failure.

Do not mutate pull requests 25, 27, 28, 29, or 31. Do not resume, advance,
rebase, merge, reset, or delete feature/SYS-020, feature/NG-023, or
feature/NG-028. The prior UI-018 attempt is retained read-only on
archive/UI-018-attempt-2026-09-11. Apply task selection and dependency-status
propagation to the complete Series strictly from the planner snapshot.

Respect the soft deadline and finalization protocol. The report must include
the complete-Series workload, remaining pending count, CI classification/platform
telemetry, and every capability pause. After task_complete, produce no
additional prose or tool calls.
```
