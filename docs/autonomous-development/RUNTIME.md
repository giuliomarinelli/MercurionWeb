# Autonomous Development Local Runtime

This document defines the canonical local runtime used by autonomous development sessions when browser/runtime validation is required.

It is imported by `AGENTS.md` and must be treated as repository-wide runtime context. Individual task files should describe the route and evidence they need, but should not invent alternate local ports or bypass the reverse proxy.

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

Do not rely on shell-specific virtual-environment activation. Invoke the virtual environment's Python interpreter directly.

Windows / PowerShell / cmd / Git Bash on the Windows development host:

```text
../MercurionTox21/.venv/Scripts/python.exe -m main
```

POSIX fallback when the same repositories are run on Linux/macOS:

```text
../MercurionTox21/.venv/bin/python -m main
```

The process is not watch-mode. It only needs to remain alive during the runtime-validation portion of the Development Session; MercurionWeb tasks must not modify it.

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
