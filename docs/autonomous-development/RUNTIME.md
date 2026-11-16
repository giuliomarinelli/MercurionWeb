# Autonomous Development Local Runtime

This document defines the canonical local runtime used by autonomous development sessions when browser/runtime validation is required.

It is imported by `AGENTS.md` and must be treated as repository-wide runtime context. Individual task files should describe the route and evidence they need, but should not invent alternate local ports or bypass the reverse proxy.
Routes quoted here or in task/report execution evidence are control-plane
metadata: they must not make an application inventory stale or count as proof
of an actual product consumer.

## Runtime topology

Browser-facing validation MUST use the development nginx edge:

```text
Chrome DevTools MCP
        |
        v
http://localhost:8888
        |
        v
nginx_sl_dev (Docker, already running)
   |                    |
   |                    +--> NestJS / API / WebSocket
   |                         host.docker.internal:8099
   |
   +-----------------------> Angular SPA
                             host.docker.internal:3498
```

The nginx development reverse proxy is expected to be running already through the local Docker development stack. Autonomous sessions MUST NOT start, stop, recreate, or reconfigure that Docker proxy unless an explicit task is specifically about the Docker/nginx development infrastructure.

The public browser origin for local validation is therefore:

```text
http://localhost:8888
```

Do NOT browse the Angular development-server port directly for application validation. The application intentionally relies on nginx to expose frontend and backend through the same browser origin; direct Angular access does not reproduce the supported local runtime topology.

## Managed application processes

Before browser-facing validation, the session runner must ensure these three application processes are running.

### 1. MercurionWebNode

Working directory:

```text
MercurionWeb Git root
```

Windows `cmd.exe` command:

```bat
set "APP_ENV=development"
set "LOCAL_DUMMY_AUTH=false"
npm run start:dev --workspace mercurion_web_node
```

POSIX command:

```bash
APP_ENV=development LOCAL_DUMMY_AUTH=false npm run start:dev --workspace mercurion_web_node
```

This is a watch-mode process and must remain alive for the validation workload.

### 2. MercurionWebNg

Working directory, relative to the `MercurionWeb` Git root:

```text
MercurionWebNg
```

Command:

```text
npm run start:dev
```

This is a watch-mode process and must remain alive for the validation workload.

### 3. MercurionTox21

`MercurionTox21` is a sibling repository. Its local path relative to the `MercurionWeb` Git root is:

```text
../MercurionTox21
```

It is a runtime dependency for the local Mercurion stack and is READ-ONLY from MercurionWeb autonomous sessions. The agent must not edit files in that repository.

Working directory:

```text
../MercurionTox21
```

Changing to that directory is mandatory: `python -m main` resolves the module
from the current working directory. Do not rewrite the command as a
MercurionWeb-root-relative interpreter invocation. Do not rely on shell-specific
virtual-environment activation; invoke the virtual environment's Python
interpreter directly and force UTF-8 console I/O on Windows.

Windows `cmd.exe` on the Windows development host:

```bat
set "PYTHONUTF8=1"
.venv\Scripts\python.exe -m main
```

POSIX fallback when the same repositories are run on Linux/macOS:

```bash
PYTHONUTF8=1 .venv/bin/python -m main
```

The process is not watch-mode. It only needs to remain alive during the
runtime-validation portion of the Development Session; MercurionWeb tasks must
not modify it. If it exits, capture its exit code and first actionable stderr
diagnostic before classifying runtime readiness. Do not retry it from a
different working directory or silently substitute another entry point.

## Startup and readiness

Runtime is task-scoped, never session-persistent across task boundaries. The
coordinator and worker must not start Angular, Nest, Tox21, test watchers, or
any other workspace-consuming process before exact base-SHA Actions evidence is
confirmed and focused task-start checks complete. Local autonomous sessions
never run `npm ci` or `npm run ci:check`. A coding-agent task must not create
duplicate application processes.

For a task that actually declares browser/runtime validation, and only after
its unchanged task-start baseline passes, the worker should:

Before step 1, the worker is in `RUNTIME_NOT_STARTED`. In that state every
network request is forbidden, including a supposedly diagnostic nginx/edge
liveness probe. Process inventory must inspect local processes only. The
worker moves to `RUNTIME_STARTED` only after steps 1-3 have each returned a
live long-running execution-session handle. Only that state permits the first
HTTP request. This ordering is mandatory even when nginx is known to be
externally managed or was reachable in a previous task.

1. start the Tox21 process in its declared working directory;
2. start NestJS in watch mode with the exact canonical command above;
3. start Angular in watch mode with the exact canonical command above;
4. keep each command attached to its own long-running execution session and
   poll its output; do not treat the initial tool yield/timeout as process
   completion and do not replace these commands with a repository PowerShell
   supervisor;
5. prove that all three managed commands were issued and remain alive. Never
   run `require.resolve`, import probes, package-manifest probes, or another
   invented dependency-tree gate before these starts. The canonical start
   commands and their real stderr are the runtime authority;
6. only after all three starts have returned live execution-session handles,
   probe `http://localhost:8888`. HTTP `502 Bad
   Gateway` or 503 means edge-live/upstream-unavailable and MUST NOT end or
   pause the task. Only a transport error such as `ECONNREFUSED` establishes
   nginx unavailability;
7. wait for up to five minutes for the first builds to finish while proving
   that all three managed processes remain alive. `nest` or another local npm
   executable being unrecognized is an install/baseline invariant failure,
   not nginx unavailability and not a runtime capability pause: stop the other
   task-owned processes and return `BASELINE_INVARIANT_FAILURE` with the first
   actionable stderr diagnostic;
8. during that wait, poll Nest through the nginx edge using
   `http://localhost:8888/health` when that endpoint is available for the
   current baseline. HTTP 502 means the edge is live and the upstream is not
   ready yet; keep waiting while the processes are alive;
9. poll the Angular application through `http://localhost:8888/` (or the safe
   route required by the task) until the application shell is returned;
10. require two consecutive successful complete probe rounds before allowing
   browser validation to begin.

The worker must capture the first actionable stderr output when a managed
process exits. It must not collapse an executable-not-found error, compiler
error, or early process exit into the generic statement "nginx unavailable".
Only an actual transport failure on port 8888 has that meaning.

If a worker accidentally requests an nginx URL while still in
`RUNTIME_NOT_STARTED`, it must discard that response, immediately execute the
three canonical starts in order, and continue from the startup barrier. It
must not wait on, classify, report, or ask a human to interpret the expected
pre-start 502/503 response.

## Dedicated local test account

The deterministic dummy-auth route is deprecated and MUST NOT be used by
autonomous workers. The shared testing identity is an existing real account;
the application does not provision, replace, or reset it.

Its credentials are stored in the git-ignored file
`MercurionWebNode/env/.env.development` as
`LOCAL_TEST_ACCOUNT_EMAIL` and `LOCAL_TEST_ACCOUNT_PASSWORD`. Every fresh
worker that needs authenticated browser state reads those local values and
performs the ordinary login flow through `http://localhost:8888/login`, even
when the persistent browser profile already contains an older session.

For the exact configured email, and only while `APP_ENV=development`, the
first-factor login bypasses adaptive `suspiciousAttempt` escalation and all MFA
selection. It still uses the real account row, password verification, session
creation, signed cookies, JWTs, Redis validation, scopes, guards, controllers,
and protected APIs. The worker must prove success through a protected response
or protected UI state; navigation or cookie presence alone is insufficient.

The shared credentials are intentionally available to local autonomous agents.
Agents must use them when authentication is required, must not substitute the
deprecated dummy route, and must not copy them into Git-tracked files or
session reports.

Credential entry MUST use Chrome DevTools MCP input tools. After
`take_snapshot` identifies the email and password field UIDs, prefer one
`fill_form` call; use individual `fill` calls only as a fallback. Never use
`navigator.clipboard`, `clipboard.readText`, `evaluate_script`, DOM injection,
or an operating-system clipboard to transfer credentials. A clipboard
permission denial is an unsupported-method error, not an authentication or
browser capability failure: retry immediately in the same worker with
`fill_form`/`fill` and do not emit `SESSION_CAPABILITY_PAUSE`. Credential values
must not be echoed in prose, shell output, reports, screenshots, or committed
files.

After capturing the declared runtime evidence, the worker stops every process
it started. It MUST do so before returning control to the coordinator. The
complete clean install and aggregate validation run only in GitHub Actions;
local autonomous sessions must not invoke them.

A task may require a more specific route or application state, but it must still enter through `http://localhost:8888`.

## Persistent browser profile

Application processes and browser state have deliberately different
lifecycles. Angular, Nest, and Tox21 remain task-scoped and must stop before a
clean install. Chrome DevTools MCP uses its dedicated default user-data
directory, persisted outside the repository, so non-production cookies and
browser storage survive runtime restarts, fresh serial workers, and later CLI
sessions. `.github/mcp.json` must not pass `--isolated`.

The repository MCP entrypoint is
`.github/scripts/start-chrome-devtools-mcp.ps1`. It passes the dedicated
profile explicitly and owns a strict serial lease: before starting MCP and
again when MCP exits, it stops only Chrome processes whose process tree is
rooted in that exact profile. This recovers automatically from a prior MCP
server that was force-terminated while leaving its Chrome subprocess alive;
the profile directory and its persistent state are never deleted. Do not
bypass the launcher with a direct `npx chrome-devtools-mcp` invocation.

The task worker is the sole owner of the MCP browser. The coordinator does not
invoke Chrome tools, and workers are never concurrent. Do not attach the MCP to
the developer's personal Chrome profile, use Incognito or Guest mode, browse
production, store production credentials, or commit/copy the user-data
directory into the repository.

The persistent profile is an optimization for ordinary browser state, not an
authentication prerequisite. Therefore a task that declares browser/runtime evidence performs
this capability preflight after its unchanged baseline and before any edit:

1. start the required application processes with the canonical commands;
2. prove the nginx edge and configured health surface are ready;
3. open the task's safe route through `http://localhost:8888`;
4. when the task needs an authenticated state, perform a fresh ordinary login
   with the shared local test account and prove it through an observable
   protected response or UI identity marker rather than cookie presence alone;
5. close extra task tabs and stop every application process started by the
   probe, while leaving the dedicated profile and its auth storage intact;
6. only then begin implementation.

If this pre-implementation probe cannot establish required runtime or complete
the real test-account login, the worker returns `SESSION_CAPABILITY_PAUSE`.
It makes no edit, commit, task-status change, or remote branch publication. The
coordinator removes only the empty unpublished local attempt branch when safe,
adds the task to the session-local capability-pause exclusion set, and continues
with the next independent `READY` task. It does not propagate dependency skips
or retry that task in the same session. The session finalizes only when no
unpaused configured `READY` task remains, the deadline is reached, or another
documented terminal condition applies.

Profile persistence may be tested independently with two
fresh sequential worker invocations: the first writes an unpredictable probe
nonce to local storage at the canonical origin; the second reads the same
nonce. Authentication is deliberately excluded because every worker logs in
again. Remove the nonce afterward.
Use the worker's explicit `browser_profile_probe` mode, outside an active
Development Session and while the canonical runtime is already running. Send
`browser_profile_probe: write`, the nonce and canonical origin to the first
synchronous `development-task-worker`; after it returns, send
`browser_profile_probe: read` with the same values to a second fresh
synchronous worker. Require, respectively:

```text
BROWSER_PROFILE_PROBE_WRITTEN <nonce>
BROWSER_PROFILE_PROBE_OK <nonce>
```

A failure, unexpected response, leaked secret, or profile-lock error keeps the
hardening pull request in draft.

### Optional Windows profile inspection

Because the committed autonomous configuration remains headless, initialize
or repair its dedicated profile outside an active Copilot CLI session. Ensure
no Chrome DevTools MCP process is using the profile, then start a visible Chrome
instance with the same dedicated user-data directory:

```powershell
$Chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$Profile = Join-Path $env:USERPROFILE ".cache\chrome-devtools-mcp\chrome-profile"

& $Chrome "--user-data-dir=$Profile" "http://localhost:8888"
```

Close that dedicated Chrome window before launching Copilot CLI. Do not copy an
existing personal profile into this directory. The profile is host state, not
repository content, and must never be added to Git. Authentication does not
need to be preserved because each worker performs a fresh login.

### Browser state lease

At capability-preflight entry, perform the fresh test-account login when the
task needs authentication. A task may alter auth or storage when its recipe
requires that transition. Before returning, close surplus tabs and remove any
probe nonce. An anonymous profile after logout is valid because the next worker
logs in again; it is not `BROWSER_PROFILE_RECOVERY_REQUIRED`.
Never record cookie values, tokens, passwords, backup codes, or Redis session
contents in a task file or report.

## Shutdown

At task completion and again at Development Session finalization, the runner
stops only the application processes that it started. No task-owned runtime
may be carried into the next task's clean-install preflight.

It must not stop the externally managed Docker nginx development proxy.

## Browser validation rule

When a task requires browser evidence, Chrome DevTools MCP must open the relevant route under:

```text
http://localhost:8888
```

Examples:

```text
http://localhost:8888/settings
http://localhost:8888/login
```

The task should specify the route, interaction, viewport, network/runtime, console, DOM/accessibility, or screenshot evidence it actually needs. The task should not repeat the whole runtime bootstrap contract unless it has exceptional prerequisites.
