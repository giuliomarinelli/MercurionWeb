---
name: mercurion-browser-runtime
description: Execute Mercurion task-scoped Tox21, Nest, Angular and Chrome validation deterministically. Use for task recipes requiring runtime, browser, login, protected-state, network, console or rendered-UI evidence.
user-invocable: false
---

# Mercurion browser and runtime validation

Read `docs/autonomous-development/RUNTIME.md` before acting. It remains the
authority; this skill provides the operational route through it.

## Before implementation

- Prove the supplied exact base SHA and focused task-start checks first.
- Start Tox21, Nest and Angular in that order as three directly managed,
  long-running sessions. Record all handles before any HTTP or Chrome request.
- Poll live output and then the nginx edge for up to the configured build
  window. Require two complete consecutive readiness rounds.
- Use only `http://localhost:8888` as the application origin.
- For protected state, perform a fresh ordinary login and prove a protected
  server-accepted result. Never infer authentication from stored cookies.
- Stop every runtime started by the probe before implementation.

An initial `502` or `503` after all three handles exist is retryable while the
upstreams compile. `ECONNREFUSED` means the edge is unavailable. A missing
workspace executable is a baseline incident, not nginx or browser failure.

## Browser lease

Use the `chrome-devtools` skill for browser operations. The MCP launcher owns
recovery of the exact persistent profile. If the first Chrome call fails, retry
the same harmless capability call once after a short bounded delay. Do not
restart application runtimes merely to recover an MCP transport failure. If the
second call fails, preserve the diagnostic and classify it with
`mercurion-outcome-classification`.

## After implementation

When the recipe requires browser evidence, restart the canonical runtimes,
repeat readiness and fresh login as applicable, and verify every declared
observable criterion. Distinguish failure of task behavior from failure of the
shared browser transport before changing a task outcome.

Always close surplus tabs, remove probe-only state, stop task-owned runtimes
and prove their absence before returning.

