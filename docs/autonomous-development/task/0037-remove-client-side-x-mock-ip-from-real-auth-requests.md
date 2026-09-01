# 0037 - Remove client-side X-Mock-IP from real auth requests

- [ ] DONE
- [ ] BLOCKED

## Objective

Ensure the Angular browser never sends the hard-coded `X-Mock-IP: 91.122.12.8` header in non-test authentication traffic. IP simulation must be confined to explicit test fixtures/interceptors and the real browser flow must rely on the trusted server/proxy IP path.

Source: `FE-015` in Series `0001`.

## Context

`AuthService.login_firstStep()` and `login_thirdStep()` currently attach `X-Mock-IP: 91.122.12.8` to real browser requests. Nest `main.ts` reads `x-mock-ip` only in development/test alongside trusted proxy/client-IP sources, but a production Angular bundle should not embed/send an IP simulation header at all. The audit identified three auth request occurrences/paths requiring review.

This is both contract hygiene and security hardening: test-only network identity must not leak into application code.

## Relevant files and modules

- `MercurionWebNg/src/app/services/auth.service.ts`
- all Angular references to `X-Mock-IP` / `x-mock-ip`
- auth login/MFA tests
- `MercurionWebNode/src/main.ts` IP extraction logic
- Nest auth controller/service tests that use mock IP
- test-only HTTP interceptors/fixtures, if introduced

## In scope

- Remove hard-coded mock-IP headers from Angular production auth requests.
- Preserve explicit IP simulation for deterministic tests only where it is genuinely needed.
- Verify server development/test support cannot be accidentally exercised by normal production/staging browser traffic.
- Add static/regression tests preventing reintroduction into production Angular code.

## Out of scope

- Redesigning the complete Nest proxy/trust/IP policy (`BE-022` owns that later).
- Removing server test support for an explicit mock IP if current backend tests require it.
- Spoofing `CF-Connecting-IP`, `X-Forwarded-For` or other production proxy headers from the browser.
- Changing geo/IP business logic.

## Decisions already made

- Real Angular application requests do not send `X-Mock-IP`.
- Any mock IP belongs to test infrastructure with an explicit test-only boundary.
- Production/staging browser code must not be able to opt into IP simulation through an ordinary feature flag.
- Backend trusted proxy/client-IP resolution remains authoritative for real requests.

## Requirements

1. Search the Angular source/tests for every `X-Mock-IP` occurrence and classify production versus test usage.
2. Remove the header from direct login and MFA/final-auth browser requests and any other production call.
3. If tests require deterministic IP simulation, move that concern into a test-only helper/interceptor/request fixture that cannot be imported by production application code.
4. Add a static/unit assertion that representative production auth requests contain expected auth/fingerprint/challenge headers but not `X-Mock-IP`.
5. Verify Nest continues to obtain a valid client IP in the canonical local nginx topology without the browser header, or document if development intentionally has no externally meaningful IP.
6. Keep the server's `x-mock-ip` branch restricted to development/test; do not broaden it to accommodate client code.
7. Ensure staging/production Angular builds contain no `X-Mock-IP` string in application bundles/source where practical to assert deterministically.

## Acceptance criteria

- [ ] No non-test Angular request sends `X-Mock-IP`.
- [ ] Login/MFA auth-service tests assert the header is absent in real request construction.
- [ ] Any remaining mock-IP facility is explicitly test-only.
- [ ] Production/staging builds cannot enable mock IP through runtime application configuration.
- [ ] Auth flows still work through the canonical local nginx edge without the header.
- [ ] Angular tests/build pass; affected Nest tests remain green.

## Validation

From `MercurionWebNg`:

```text
npm test -- --watch=false
npm run build
npm run build -- --configuration staging
```

Run affected Nest tests if server IP handling/test fixtures change.

Search production Angular source and generated production output for `X-Mock-IP` and verify no application occurrence remains.

## Browser validation

Mandatory through Chrome DevTools MCP and `http://localhost:8888` when a login request can be generated safely:

1. Open the login flow through nginx.
2. Trigger the first auth request.
3. Inspect the request headers in Network and verify `X-Mock-IP` is absent.
4. If MFA is available, inspect the final MFA authentication request as well.
5. Confirm the server response/flow remains functional and there are no CORS/origin regressions.

## Stop conditions

Mark `BLOCKED` if local authentication currently cannot function without `X-Mock-IP` because the backend has an undocumented hard dependency on it rather than using the canonical proxy/request IP. Report the exact server path; do not keep the production browser spoofing header as a workaround.

## Dependencies

- `0023-enforce-angular-environment-import-boundaries.md`

## Implementation notes

This task should remove the production behaviour, not merely guard it with `if (!environment.production)`. Test-only simulation belongs in test code so bundling/config mistakes cannot expose it.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not started._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._