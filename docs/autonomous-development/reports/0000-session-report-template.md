---
session: "<session name>"
configuration: "<active YAML path>"
series: "<series number/path>"
started_at: "<RFC 3339 timestamp>"
soft_deadline: "<RFC 3339 timestamp>"
finished_at: "<RFC 3339 timestamp>"
stop_reason: "<deadline|workload-exhausted|session-fatal-blocker>"
initial_develop_sha: "<sha>"
final_develop_sha: "<sha>"
final_develop_ci: "<run URL/result or unavailable with reason>"
---

# Autonomous Development Session Report

This file is a template only. A session report copies this structure to a dated filename; the coordinator never overwrites this file.

## Executive summary

- Attempted: `<count>`
- Completed: `<count>`
- Blocked: `<count>`
- Still pending: `<count>`
- Stop reason: `<reason>`
- Final `develop`: `<clean/dirty, local SHA, origin SHA, exact-SHA CI>`

## Initial green-baseline evidence

- Base SHA: `<sha>`
- Existing exact-SHA CI evidence: `<run/result or not yet available for task 0001>`
- Local clean-install/gate commands: `<commands>`
- Results: `<results>`
- Phase 0 remediation: `<commits/summary or none>`

## Task ledger

| Task | Source | Result | Feature branch / frozen SHA | Base SHA | Task commits | Merge SHA / CI | Revert SHA / CI | Status SHA / CI |
|---|---|---|---|---|---|---|---|---|
| `<0001>` | `<SYS-001>` | `<DONE/BLOCKED>` | `<branch / sha>` | `<sha>` | `<sha(s)>` | `<sha / run>` | `<sha / run or n/a>` | `<sha / run or n/a>` |

## Blocked tasks and preserved branches

For every block, record the blocker category, exact diagnostic, required human decision/capability, hard-dependent tasks skipped, and the local/remote frozen branch SHA. Confirm that no blocked branch was advanced, rebased, reset, merged-from-`develop`, amended or deleted.

## Baseline or upstream incidents

Record any revert-tree mismatch or failure to re-establish exact-SHA green `develop` separately from the task blocker. Include the last known-green SHA/run, failed merge SHA/run, recovery SHA/run, observed tree hashes and why the session stopped.

_None._

## Validation and browser evidence

- Task-specific checks: `<summary>`
- Full CI-parity preflights: `<summary>`
- Browser/runtime routes and evidence: `<summary without secrets>`
- Managed processes stopped: `<yes/no/details>`

## Deadline and finalization

- Soft deadline reached: `<timestamp/not reached>`
- Active task completed after deadline: `<task/duration or n/a>`
- Report commit SHA: `<sha>`
- Report commit exact-SHA CI: `<run/result or unavailable with reason>`

## Host usage

- Model/reasoning: `<model/profile>`
- Autopilot/task-session information: `<available counters or unavailable>`
- Credit/token/context information: `<available counters or unavailable>`

## Human follow-up

1. `<decision, incident recovery, frozen branch review, or none>`
