# Mercurion Code Red — autonomous allowlist launch

Use this file only after pull request #31 is merged into `develop`, its exact
merge SHA has a successful full GitHub Actions `Required gate`, and the
dedicated non-production browser-profile acceptance probe documented in
`RUNTIME.md` has succeeded across two fresh sequential workers.

The immutable session configuration is:

```text
docs/autonomous-development/session.until-2026-09-12.yaml
```

The coordinator must refuse a new launch at or after
`2026-09-12T10:00:00+02:00` (Europe/Rome).

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

npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci fallito." }

npm run ci:check
if ($LASTEXITCODE -ne 0) { throw "ci:check fallito." }

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

## Launch prompt

```text
Run the bounded autonomous Mercurion development session defined by
docs/autonomous-development/session.until-2026-09-12.yaml.

Read the complete active configuration, AGENTS.md,
docs/autonomous-development/PROTOCOL.md,
docs/autonomous-development/RUNTIME.md, and
docs/autonomous-development/CI-BASELINE.md before any repository write.

Perform every configured startup and capability probe. Refuse launch at or
after 2026-09-12T10:00:00+02:00. Require a clean, synchronized develop and a
successful fresh full GitHub Actions Required gate for its exact SHA. Confirm
the dedicated persistent non-production browser profile was accepted outside
this session; never expose its secrets.

Before task selection run `npm run autonomous:plan`. Treat its versioned JSON
as the sole dependency authority; fail closed on malformed recipes, missing
hard dependencies, cycles, stale terminal skips, or planner errors.

This session has an exact five-task autonomous allowlist: 0021, 0059, 0090,
0107 and 0161. All omitted PENDING recipes are human-led or later-session work:
do not create branches/workers for them, change their outcomes, or propagate
dependency skips because of their exclusion. The expected first READY task is
0021; there are no newly terminal allowlisted descendants at launch.

Execute exactly one recipe per fresh synchronous development-task-worker. Do
not bundle tasks. Create each feature branch locally, publish it only after a
task-specific commit exists, require exact feature-SHA CI before a no-ff
no-GPG-sign merge, then require exact merge-SHA CI before continuing.

Do not mutate pull requests 25, 27, 28, 29, or 31. Do not resume, advance,
rebase, merge, reset, or delete feature/SYS-020, feature/UI-018,
feature/NG-023, or feature/NG-028. No status is created solely because a task
is outside the allowlist.

Respect the soft deadline and finalization protocol. The report must include
the configured allowlist, excluded pending count, CI classification/platform
telemetry, and every capability pause. After task_complete, produce no
additional prose or tool calls.
```
