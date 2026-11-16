# Home layout test — font-loading race

7 November 2026. Focused maintenance directly on `MercurionWeb/develop`,
explicitly requested by the owner after T21-11 integration. Application CSS,
template, animations, fonts and assertion tolerances are preserved.

## Reproduced cause

The responsive unit test moves the fixture into a fresh iframe and copies its
styles, including `Space Grotesk` font faces with `font-display: swap`. The
iframe has its own font set. The old test recorded link bounds immediately,
finished animations and waited one animation frame on the parent window.
It compared two measurements without synchronizing the iframe's font loading.

Temporary diagnostics showed `doc.fonts.status === 'loading'` at both
measurements in a passing run. Waiting for `doc.fonts.ready` only before the
second measurement reproduced the exact previously observed CI coordinates:

| Viewport | Before fonts loaded: link top | After fonts loaded: link top |
| --- | --- | --- |
| 320 × 568 | 346.625 / 408.625 / 470.625 | 360.21875 / 422.21875 / 484.21875 |
| 1440 × 900 | 631.640625 for all three | 646.9375 for all three |

That diagnostic run failed two viewport tests (20 passed). Font metric changes
were being attributed to animation shifts. This is a reproduced race in the
test's measurement setup, not a claim that font swaps never move production UI.

## Correction

Pause the actual iframe animations at time zero, resolve layout to discover
used fonts and await that iframe document's `fonts.ready` before recording the
baseline. Then finish those animations and wait a frame on the iframe window
before comparing bounds. This retains the initial-to-final animation check
without allowing it to expire while fonts load.

The [CSS Font Loading specification](https://drafts.csswg.org/css-font-loading/#font-face-set-ready)
defines the font-set readiness used here; a parent-window frame alone does not
wait for the iframe's fonts. No arbitrary timeout, retry, font substitution,
animation disabling or widened numeric tolerance was added. Overflow checks,
44 px minimum controls, width/top assertions and all five viewports remain.

## Evidence

Both corrected focused runs passed **22 tests each** on Chrome Headless 157,
Windows, using the existing dependencies. The focused command from
`MercurionWebNg` is:

```powershell
node ../node_modules/@angular/cli/bin/ng.js test --watch=false --karma-config=karma.conf.js --include=src/app/pages/home.page/home.page.component.spec.ts
```

This includes the canonical accessibility tests imported by the shared test
setup; it is not the complete Angular suite. Focused ESLint passed with zero
warnings. The permanent CI supplies the full suite on the final pushed SHA;
its result is recorded separately at handoff.

A temporary negative control added a 16 px translate animation to the actions
before collecting the animations. All five responsive cases failed their
original top-coordinate assertions (**5 failed, 17 passed**). The mutation was
then removed: the synchronization does not hide real animation-driven shifts.

Local diagnostics and test logs are retained outside Git at
`C:/Users/giuli/.codex/artifacts/angular-home-layout/`. Temporary logging and
negative-control mutations must not be included in the delivered test.
No application backend, Tox21, user services or infrastructure manifest is
changed or restarted for this task. A focused Karma run owns only its test
server and headless browser and exits before handoff.
