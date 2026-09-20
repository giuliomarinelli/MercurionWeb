# Mercurion Code Red — overweek autonomous full-Series launch v16

Use this file only after this launch manifest, its session configuration, and
the dedicated real test-account login policy are integrated into `develop`; the
exact resulting `develop` SHA must have a successful fresh full GitHub Actions
`Required gate`. The dedicated non-production browser profile must be available, but no
profile-persistence or pre-authenticated-state probe is a launch prerequisite:
every worker establishes its own fresh real-account login.

The immutable session configuration is:

```text
docs/autonomous-development/session.overweek-2026-09-28-v16.yaml
```

The coordinator must refuse a new launch at or after
`2026-09-28T10:00:00+02:00` (Europe/Rome, CEST).

The current active snapshot contains 210 `DONE`, 5 `PENDING`, no `BLOCKED`,
no `SKIPPED_DEPENDENCY` and no `REVERTED` recipes. Five reserved
Notebook recipes are archived under `deferred-task/` and are non-executable. Every
recipe currently marked `DONE` remains terminal; task selection comes only
from the current authoritative planner snapshot.

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
copilot --agent development-session-coordinator --allow-all-tools --allow-all-urls --add-dir ../MercurionTox21 --model gpt-5.6-luna --reasoning-effort medium --context default --autopilot
```

Il parent deve partire esplicitamente con GPT-5.6 Luna, reasoning Medium e
context tier `default` (300k). I worker devono ereditare questa configurazione
esatta: il coordinator non deve specificare override nella chiamata `task`.

## Inside Copilot CLI

Prima di incollare il prompt esegui:

```text
/model
/context
/usage
/permissions show
/mcp list
/skills list
/keep-alive on
```

Conferma coordinator attivo, GPT-5.6 Luna, reasoning Medium, context default
300k, uso iniziale atteso e permessi repository/rete disponibili,
Chrome DevTools MCP elencato e keep-alive abilitato. Il browser deve usare solo
il profilo dedicato non-production, mai Incognito, Guest o il profilo personale.
Conferma anche la discovery delle cinque skill di progetto `chrome-devtools`,
`mercurion-browser-runtime`, `mercurion-ci-lifecycle`,
`mercurion-outcome-classification` e `mercurion-task-execution`.
Per i task che richiedono l'area riservata, ogni worker deve leggere le
credenziali condivise dal file git-ignored
`MercurionWebNode/env/.env.development`, eseguire un login ordinario da
`http://localhost:8888/login` e provare una sessione accettata dal server. Non
deve usare la route dummy-auth deprecata né dipendere dalla sessione conservata
nel profilo Chrome.

## Launch prompt

```text
Run the bounded autonomous Mercurion development session defined by
docs/autonomous-development/session.overweek-2026-09-28-v16.yaml.

Read the complete active configuration, AGENTS.md,
docs/autonomous-development/PROTOCOL.md,
docs/autonomous-development/RUNTIME.md, and
docs/autonomous-development/CI-BASELINE.md before any repository write.

Invoke the repository project skills required by the agent profiles. The
coordinator must invoke `mercurion-ci-lifecycle` and
`mercurion-outcome-classification` before the first startup mutation. Every
normal worker must invoke `mercurion-task-execution` and
`mercurion-outcome-classification`, adding `mercurion-browser-runtime` and
`chrome-devtools` whenever browser/runtime evidence is required. The nonce
capability probe remains tool-free.

Never run `npm ci` or `npm run ci:check` locally. Use the required exact-SHA
GitHub Actions runs for clean-install and complete-gate evidence, and run only
focused local validation that reuses the existing dependency tree.

The coordinator and every normal worker must use GPT-5.6 Luna, Medium reasoning
and the default 300k context tier. Every `task` invocation must omit `model`,
`reasoning_effort` and `context_tier`, allowing exact inheritance from the
parent. Conformance is established by the verified parent launch,
override-free task calls and the correlated handshake. Workers must not
self-attest host metadata that the host does not expose. An explicit override
or exposed mismatch enters SESSION_RECOVERY_PENDING without task mutation. Use
only the configured GPT-5.6 Luna profile; if it cannot complete a task, follow
the normal BLOCKED lifecycle. Do not impose a global
AI-credit or Autopilot-continuation cap: the session must remain able to process
a virtually unlimited number of serial tasks until the configured deadline or
genuine workload exhaustion.

Perform every configured startup and capability probe. Refuse launch at or
after 2026-09-28T10:00:00+02:00. Require a clean, synchronized develop and a
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
implementation. Snapshot the login page, identify the email/password field UIDs,
and use Chrome DevTools MCP `fill_form`, with `fill` only as fallback. Never use
`navigator.clipboard`, `clipboard.readText`, `evaluate_script`, DOM injection,
or an OS clipboard for credentials. A clipboard permission denial is an
unsupported-method error: retry with `fill_form`/`fill` in the same worker and
do not emit `SESSION_CAPABILITY_PAUSE`. Never use the deprecated dummy-auth route or rely on a session
persisted by an earlier worker. A missing or rejected test-account session is
SESSION_CAPABILITY_PAUSE and must not mutate task outcomes or propagate skips.
Record that task in a session-local exclusion set and continue with the next
independent READY task; never retry the same paused task in this session.

Before task selection run `npm run autonomous:plan`. Treat its versioned JSON
as the sole dependency authority; fail closed on malformed recipes, missing
hard dependencies, cycles, stale terminal skips, or planner errors.

The configured `workload.tasks` list is empty, so every active recipe file is in
scope: there is no autonomous allowlist. The planner currently exposes exactly
5 PENDING recipes; terminal recipes remain in scope only for state validation
and can never be selected. Reserved numeric gaps and recipes in `deferred-task/`
are skipped without error. Select the earliest filename-ordered READY task from
the authoritative planner output; the expected first READY task is 0112.
Continue serially through eligible tasks until the soft deadline or
genuine workload exhaustion. No error, denial, branch collision, CI-observation
failure, baseline incident, or unavailable capability may finalize the session
early while configured pending work remains. Isolate one-task failures, skip a
colliding branch for the current scheduling pass, and use
`SESSION_RECOVERY_PENDING` for unsafe shared-state failures.

All 210 recipes currently marked `DONE` are terminal; never select them again.
The archived `0020` and `0164`-`0167` recipes are not candidates and their
absence from the active directory is not a branch collision or recovery state.
When a selected task requires authenticated browser evidence,
proceed only after a fresh ordinary login with the shared real test account has
established a protected server-accepted session. Otherwise apply
`SESSION_CAPABILITY_PAUSE` without mutating the task or propagating dependency
skips, then continue with the next independent READY task outside the
session-local pause set. If no task remains outside the exclusion set, classify
the state as NO_SELECTABLE_TASKS and remain in SESSION_RECOVERY_PENDING; this is
never workload exhaustion while any configured recipe is still PENDING.

Execute exactly one recipe per fresh synchronous development-task-worker. Do
not bundle tasks. Create each feature branch locally, publish it only after a
task-specific commit exists, require exact feature-SHA CI before a no-ff
no-GPG-sign merge, then require exact merge-SHA CI before continuing.
When exact feature-SHA CI reports an actionable repository-controlled failure,
keep the task in CI_PENDING and invoke a fresh synchronous CI-repair worker for
the same recipe and branch. Supply the exact failed SHA/run/job evidence,
commit and push the narrow correction, and retry exact-SHA CI up to three
times. Do not mark BLOCKED on the first actionable CI failure.

No pending recipe has an `authorized_recovery` entry in this session. Treat any
pre-existing feature branch as a collision unless a new direct human instruction
provides the exact pending recipe, Source, local and remote refs, and preserved SHA.

There are no recipes currently marked `BLOCKED`, `REVERTED` or
`SKIPPED_DEPENDENCY`, and there are no frozen recovery branches in this
session. The authoritative planner reports no skip closure and no stale skips.
Let it determine `READY` versus `WAITING_DEPENDENCY`; do not reconstruct the
dependency graph or reopen terminal tasks by inference.

Do not mutate pull requests 25, 27, 28, 29, or 31. No existing feature branch
is authorized for recovery by this configuration; treat any collision as a
session branch collision. Apply task selection and dependency-status
propagation to the active recipe set strictly from each fresh planner snapshot.

Respect the soft deadline and finalization protocol. The report must include
the complete-Series workload, remaining pending count, CI classification/platform
telemetry, and every capability pause. After task_complete, produce no
additional prose or tool calls.

Immediately before any final report or task_complete, run
`npm run autonomous:assert-finalizable -- docs/autonomous-development/session.overweek-2026-09-28-v16.yaml`
and require exit code zero. The command obtains and validates a fresh planner
snapshot. Pre-deadline task_complete is permitted only when
`currentCounts.PENDING === 0`. READY=0,
no task outside an exclusion set, capability exhaustion, branch collisions,
waiting dependencies, and fatal blockers do not satisfy this guard. When
PENDING is greater than zero before the deadline, the guard fails closed:
remain in SESSION_RECOVERY_PENDING and rebuild the planner periodically with
bounded backoff until work becomes selectable or the soft deadline arrives.
```
