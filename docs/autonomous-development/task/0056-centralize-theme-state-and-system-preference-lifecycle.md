# 0056 - Centralize theme state and system-preference lifecycle

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make one theme store own user preference, OS fallback, DOM theme application, cross-tab persistence and system-preference listener lifecycle; header/footer/other UI must only consume theme state or issue semantic theme commands.

Source: `FE-034` in Series `0001`.

## Context

`ThemeManagerService` already centralizes much of theme state but directly accesses `window`, `document`, `localStorage`, storage events and `matchMedia`, registering a media-query listener without an explicit teardown handle. Theme-related UI and persistence therefore need to converge on one owner that also uses the versioned storage infrastructure from `0054` and follows browser-resource lifecycle rules from `0050`.

## Relevant files and modules

- `MercurionWebNg/src/app/services/context/theme-manager.service.ts`
- `MercurionWebNg/src/app/Models/theme.models.ts`
- header/footer/settings/theme controls and other theme consumers
- browser storage registry from `0054`
- browser resource lifecycle infrastructure from `0050`
- root/document application bootstrap where theme class must be applied early

## In scope

- Make one theme store/facade the sole state owner.
- Route persisted theme preference through the versioned storage registry.
- Own the `prefers-color-scheme` media-query listener and cross-tab storage listener deterministically.
- Keep OS-following and explicit light/dark preference semantics separate and testable.
- Make DOM class/data-theme updates a controlled side effect of canonical state.
- Remove duplicate UI-side theme mutation/storage/listener logic.
- Add theme state, persistence, cross-tab and system-preference tests.

## Out of scope

- Redesigning light/dark visual tokens.
- Adding additional themes.
- General design-system work.
- Changing browser storage registry semantics.

## Decisions already made

- Supported user choices remain `light`, `dark` and system/OS preference.
- Explicit user choice overrides OS changes until the user selects system mode again.
- System mode tracks later OS preference changes.
- Theme persistence belongs to the versioned registry and invalid legacy/corrupt values fall back safely.
- UI components consume state/commands; they do not own media/storage listeners.

## Requirements

1. Audit all theme reads/writes/listeners and remove duplicate owners.
2. Adapt `ThemeManagerService` or replace it with a canonical store whose public API exposes readonly state and semantic `chooseTheme`/equivalent commands.
3. Use registry-owned storage descriptor/codec from `0054`, including migration of the legacy `tw_theme` representation.
4. Register exactly one system media-query listener and one necessary cross-tab listener with explicit teardown/application lifetime.
5. In system mode, react to OS changes; in user mode, ignore OS changes while retaining the chosen theme.
6. Apply/remove root `dark` class and `data-theme` deterministically from store state.
7. Guard browser-only APIs so tests/SSR-like non-browser construction does not crash if applicable to current Angular build mode.
8. Add tests for first load, saved light/dark, system mode, OS change, cross-tab update, corrupt/legacy storage and cleanup.

## Acceptance criteria

- [ ] One theme owner controls preference, resolved theme, persistence and DOM application.
- [ ] Header/footer/settings and other consumers do not mutate storage or register theme listeners directly.
- [ ] System mode tracks OS changes; explicit user mode does not.
- [ ] Cross-tab changes converge exactly once without loops.
- [ ] Legacy/corrupt stored theme data migrates/falls back safely.
- [ ] Listener registration/cleanup is deterministic.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused theme/store/storage fake-media-query tests, static storage-access checks and the canonical CI-parity gate.

## Browser validation

Using Chrome DevTools MCP through `http://localhost:8888`:

1. switch light → dark → system and verify root class/data attribute plus visible UI;
2. reload and verify explicit preference persistence;
3. in system mode emulate/change `prefers-color-scheme` and verify live update;
4. when browser tooling permits two pages, change theme in one and verify cross-tab convergence without duplicate flicker/events.

## Stop conditions

Mark `BLOCKED` if current product semantics for system mode versus saved explicit theme conflict across consumers and no authoritative behaviour exists. Record the conflicting flows rather than preserving two theme authorities.

## Dependencies

- `0050-own-browser-listeners-timers-and-animation-frames-deterministically.md`
- `0054-establish-a-versioned-browser-storage-registry.md`

## Implementation notes

The current service is already the natural starting owner; refactor it rather than creating a second theme store unless separation materially improves testability. The key requirement is one authority and deterministic resource ownership.

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