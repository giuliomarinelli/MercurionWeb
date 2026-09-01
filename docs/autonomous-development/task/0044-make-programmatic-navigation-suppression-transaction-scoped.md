# 0044 - Make programmatic navigation suppression transaction-scoped

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace the persistent `lastProgrammaticNav` suppression in application navigation orchestration with transaction-scoped loop prevention that always releases after the current navigation succeeds, fails, is cancelled or is superseded.

Source: `FE-022` in Series `0001`.

## Context

The audited `AppComponent` keeps `lastProgrammaticNav` in constructor scope. `safeNavigate(target)` returns immediately whenever the same target was previously requested, but the value is not reset when that navigation reaches a terminal router event. A later legitimate navigation to the same target can therefore be suppressed indefinitely.

Task `0043` moves this logic out of the root component; this task defines the correct lifecycle for loop prevention in its final navigation owner.

## Relevant files and modules

- navigation coordinator/facade produced by `0043`
- `MercurionWebNg/src/app/app.component.ts` until migration is complete
- Angular Router event handling
- route policy from `0041`
- redirect-intent store from `0033`

## In scope

- Define a navigation transaction/in-flight model for programmatic redirects.
- Suppress only duplicate requests belonging to the same active navigation intent.
- Clear suppression on `NavigationEnd`, `NavigationCancel`, `NavigationError` and superseding intent.
- Preserve redirect-loop protection for auth/welcome/login rules.
- Add deterministic router tests for repeated target navigation and failure/cancellation.

## Out of scope

- Changing route destinations or post-auth redirect policy.
- Replacing Angular Router.
- Full route-manifest work.

## Decisions already made

- Loop prevention may not permanently blacklist a URL.
- A future independent navigation to the same target is valid.
- Navigation terminal events must release transaction state.
- Newer navigation intent supersedes obsolete pending intent when the existing router policy permits it.

## Requirements

1. Remove persistent target-only suppression state.
2. Track the active programmatic navigation through an ID/token, promise/result or equivalent transaction boundary.
3. Deduplicate repeated requests only while the matching transaction is still active.
4. Release state for successful, cancelled, errored and superseded navigation.
5. Ensure redirect effects cannot recursively schedule the same target during one transaction.
6. Add tests for A→B, later A→B again, cancellation then retry, error then retry, and duplicate requests during one in-flight navigation.
7. Verify browser back/forward and user-initiated navigation are not incorrectly suppressed.

## Acceptance criteria

- [ ] No persistent `lastProgrammaticNav`-style target blacklist remains.
- [ ] Duplicate in-flight navigation is prevented without blocking future legitimate navigation.
- [ ] Cancel/error paths reset suppression deterministically.
- [ ] Existing auth/welcome redirect loops remain prevented.
- [ ] Router tests cover repeated and terminal-event scenarios.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused navigation-coordinator/router tests plus the canonical CI-parity gate.

## Browser validation

Through `http://localhost:8888`, navigate repeatedly between routes that trigger programmatic redirects, including returning later to the same target. Use back/forward once and verify no valid navigation is silently ignored and no redirect loop appears.

## Stop conditions

Mark `BLOCKED` if the current route/session rules can generate an unavoidable redirect cycle even without the stale suppression variable. Report the exact cycle and required policy decision rather than masking it with longer-lived URL suppression.

## Dependencies

- `0043-reduce-appcomponent-to-a-thin-application-shell.md`

## Implementation notes

Prefer observing Angular Router's real terminal events/results over time-based clearing. This is a navigation transaction problem, not a debounce problem.

## Execution notes

### Feature branch
_Not started._

### Preflight
_Not started._

### Preflight remediation
_None._

### Summary
_Not started._

### Task-specific validation performed
_Not started._

### Full pre-merge CI-parity validation
_Not started._

### Browser validation performed
_Not started._

### Commits
_Not recorded._

### Merge / CI
_Not started._

### Rollback
_Not applicable._

### Blocker / human decision required
_None._