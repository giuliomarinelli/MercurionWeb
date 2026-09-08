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

Command:

```text
npm run start:dev --workspace mercurion_web_node
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

Windows / PowerShell on the Windows development host:

```powershell
$env:PYTHONUTF8 = "1"
& .\.venv\Scripts\python.exe -m main
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
any other workspace-consuming process before the unchanged task-start `npm ci`
plus `npm run ci:check` preflight completes. A coding-agent task must not create
duplicate application processes.

Only after implementation reaches a task that actually declares
browser/runtime validation, the worker should:

1. verify that the Docker nginx edge is already reachable or fail/block runtime validation;
2. start the Tox21 process when not already managed by the current session;
3. start NestJS in watch mode;
4. start Angular in watch mode;
5. wait for the managed processes to remain alive;
6. verify Nest through the nginx edge using `http://localhost:8888/health` when that endpoint is available for the current baseline;
7. verify the Angular application through `http://localhost:8888/`;
8. only then allow browser validation to begin.

After capturing the declared runtime evidence, the worker stops every process
it started. It MUST do so before the final pre-merge `npm ci` plus
`npm run ci:check`; on Windows, a live Angular/esbuild watcher can otherwise
lock native executables under `node_modules` and make the clean install fail
with `EPERM` or `ENOTEMPTY`.

A task may require a more specific route or application state, but it must still enter through `http://localhost:8888`.

## Persistent browser profile

Application processes and browser state have deliberately different
lifecycles. Angular, Nest, and Tox21 remain task-scoped and must stop before a
clean install. Chrome DevTools MCP uses its dedicated default user-data
directory, persisted outside the repository, so non-production cookies and
browser storage survive runtime restarts, fresh serial workers, and later CLI
sessions. `.github/mcp.json` must not pass `--isolated`.

The task worker is the sole owner of the MCP browser. The coordinator does not
invoke Chrome tools, and workers are never concurrent. Do not attach the MCP to
the developer's personal Chrome profile, use Incognito or Guest mode, browse
production, store production credentials, or commit/copy the user-data
directory into the repository.

The persistent profile is an optimization, not proof of authentication. A
cookie may be expired, its Redis record may be absent, or a backend secret may
have changed. Therefore a task that declares browser/runtime evidence performs
this capability preflight after its unchanged baseline and before any edit:

1. start the required application processes with the canonical commands;
2. prove the nginx edge and configured health surface are ready;
3. open the task's safe route through `http://localhost:8888`;
4. when the task needs an authenticated state, prove it through an observable
   protected response or UI identity marker rather than cookie presence alone;
5. close extra task tabs and stop every application process started by the
   probe, while leaving the dedicated profile and its auth storage intact;
6. only then begin implementation.

If this pre-implementation probe cannot establish required runtime or
non-production authentication, the worker returns `SESSION_CAPABILITY_PAUSE`.
It makes no edit, commit, task-status change, or remote branch publication. The
coordinator removes only the empty unpublished local attempt branch when safe,
finalizes the session, and propagates no dependency skips. A human may restore
the environment or authenticate the dedicated profile and start a new session.

Before enabling unattended reuse, prove profile persistence once with two
fresh sequential worker invocations: the first writes an unpredictable probe
nonce to local storage at the canonical origin; the second reads the same
nonce and proves the approved authenticated state. Remove the nonce afterward.
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

A failure, unexpected response, leaked secret, profile-lock error, or missing
authenticated marker keeps the hardening pull request in draft.

### One-time Windows profile bootstrap

Because the committed autonomous configuration remains headless, initialize
or repair its dedicated profile outside an active Copilot CLI session. Ensure
no Chrome DevTools MCP process is using the profile, then start a visible Chrome
instance with the same dedicated user-data directory:

```powershell
$Chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$Profile = Join-Path $env:USERPROFILE ".cache\chrome-devtools-mcp\chrome-profile"

& $Chrome "--user-data-dir=$Profile" "http://localhost:8888"
```

Authenticate only with the approved non-production account, verify a protected
page, and close that dedicated Chrome window before launching Copilot CLI. Do
not copy an existing personal profile into this directory. The profile is host
state, not repository content, and must never be added to Git.

### Browser state lease

At capability-preflight entry, record the non-sensitive identity/state marker
that proves the canonical profile is authenticated. A task may alter auth or
storage only when its recipe explicitly requires that transition. Before the
worker returns, close surplus tabs, remove any probe nonce, and restore the
canonical authenticated state. Never record cookie values, tokens, passwords,
backup codes, or Redis session contents in a task file or report.

If the task itself completed and passed validation but its explicit logout or
storage scenario leaves the shared profile unauthenticated, report
`BROWSER_PROFILE_RECOVERY_REQUIRED` to the coordinator. The task may finish its
ordinary integration lifecycle, but the coordinator starts no later task and
finalizes the session after integration until a human restores the profile.

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
