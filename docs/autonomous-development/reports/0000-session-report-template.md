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
- Reverted: `<count>`
- Skipped because of dependency: `<count>`
- Still pending: `<count>`
- Stop reason: `<reason>`
- Final `develop`: `<clean/dirty, local SHA, origin SHA, exact-SHA CI>`

## Initial green-baseline evidence

- Base SHA: `<sha>`
- Exact `develop`-SHA CI evidence: `<Windows/Linux jobs and Required gate URL/result>`
- Local clean-install/gate commands: `<commands>`
- Results: `<results>`
- Separate baseline remediation: `<PR/commits or none; never charge to a numbered task>`

## Task ledger

| Task | Source | Result | Feature branch / frozen SHA | Base SHA | Task commits | Feature SHA / CI | Merge SHA / CI | Revert SHA / CI | Status SHA / CI |
|---|---|---|---|---|---|---|---|---|---|
| `<0001>` | `<SYS-001>` | `<DONE/BLOCKED/REVERTED/SKIPPED_DEPENDENCY>` | `<branch / sha or none>` | `<sha or n/a>` | `<sha(s) or n/a>` | `<sha / Windows+Linux Required gate>` | `<sha / run or n/a>` | `<sha / run or n/a>` | `<sha / run>` |

## Blocked and reverted tasks

For every `BLOCKED` task, record the pre-merge blocker category, exact diagnostic, required human decision/capability, partial work and local/remote frozen branch SHA. For every `REVERTED` task, record merge/revert/status SHAs and CI, cause category, regression evidence and frozen branch SHA. Confirm that neither branch class was advanced, rebased, reset, merged-from-`develop`, amended or deleted.

## Skipped dependency chains

For every `SKIPPED_DEPENDENCY` task, record direct terminal non-`DONE` prerequisites and the transitive root cause. Confirm that no feature branch or worker invocation was created. Distinguish these from tasks left pending only because the deadline/workload ended.

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
