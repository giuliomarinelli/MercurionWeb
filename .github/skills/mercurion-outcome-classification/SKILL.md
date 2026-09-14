---
name: mercurion-outcome-classification
description: Classify Mercurion autonomous failures without charging shared infrastructure incidents to task outcomes. Use whenever coordinator or worker must choose SESSION_CAPABILITY_PAUSE, BASELINE_INVARIANT_FAILURE, CI_REPAIR_PENDING, SESSION_RECOVERY_PENDING, BLOCKED or REVERTED.
user-invocable: false
---

# Mercurion outcome classification

Read the applicable blocking and integration sections of
`docs/autonomous-development/PROTOCOL.md`. Classify from evidence and timing,
not from the last command's label.

| Evidence boundary | Classification | Persistent task mutation |
| --- | --- | --- |
| Missing/red/unverifiable base before task changes | `BASELINE_INVARIANT_FAILURE` | none |
| Runtime, MCP or fresh login unavailable before task changes | `SESSION_CAPABILITY_PAUSE` | none |
| Unsafe shared Git/GitHub/configuration state | `SESSION_RECOVERY_PENDING` | none |
| Actionable repository-controlled feature CI failure within retry budget | `CI_REPAIR_PENDING` | provisional only |
| Task implementation or acceptance behavior cannot be completed safely before merge | `BLOCKED` | `BLOCKED` only |
| Post-merge CI fails or is unverifiable | revert, then `REVERTED` | `REVERTED` only |

Before assigning `BLOCKED` after implementation, establish whether the failure
is caused by task behavior or by shared infrastructure. A Chrome MCP transport
timeout, GitHub observation outage or runner interruption does not by itself
prove the task implementation is defective. Recover or re-observe within the
configured bounds first. Never claim acceptance evidence that was not obtained.

Record exact command/run/tool diagnostics without credentials or secret state.
Persistent outcomes remain terminal within the active session.

