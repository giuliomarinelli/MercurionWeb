# 0018 - Classify or remove unowned REST routes

- [ ] DONE
- [ ] BLOCKED

## Objective

Give every Nest REST route explicit ownership and consumer classification so no server endpoint remains an unexplained orphan.

Source: `SYS-018` in Series `0001`.

## Context

The audit compared the REST surface with Angular `HttpClient` calls and found 14 server routes with no Angular HTTP consumer. This does not imply all 14 are dead: the Series explicitly notes browser/system endpoints such as OAuth flows, assets/health, admin and test routes. Each route must therefore be classified from evidence before any deletion.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/**/controllers/`
- `MercurionWebNode/src/main.ts`
- `MercurionWebNg/src/app/services/`
- `MercurionWebNg/src/app/pages/`
- `MercurionWebNg/src/app/app.routes.ts`
- `docker_sl/nginx_dev/nginx.conf`
- repository scripts/tests/docs referencing server URLs

## In scope

- Reproduce the complete Nest REST route inventory and Angular HTTP-call inventory.
- Identify the 14 baseline routes without Angular `HttpClient` consumers and any current equivalents.
- Classify each route as browser/system API, documented external consumer, active product feature, test/dev-only endpoint, or removable orphan.
- Record ownership and evidence in a versioned machine/human-readable inventory.
- Remove only routes classified as obsolete with sufficient evidence and clean their implementation/tests/docs.
- Add a repeatable route-ownership check preventing new unclassified endpoints.

## Out of scope

- Assuming every route without an Angular `HttpClient` call is dead.
- Removing health, static/browser OAuth, admin or external integration endpoints merely because their consumer is not Angular `HttpClient`.
- Redesigning endpoint contracts.

## Decisions already made

- Every server route needs an explicit classification/owner.
- Static reachability is evidence, not proof of dead code.
- Destructive removal requires positive evidence that the endpoint is obsolete.

## Requirements

1. Enumerate controller method, HTTP verb, effective `/api` path/global-prefix exception and source location for every REST endpoint.
2. Enumerate Angular/browser/system/repository references to those paths.
3. Produce a classification record for all baseline-unconsumed routes with evidence.
4. For external-consumer routes, record the documented consumer/owner rather than inventing one.
5. Remove only endpoints that are conclusively classified obsolete.
6. Add an automated or reviewable route-ownership gate for future endpoints.
7. Keep the route inventory aligned with task `0021` REST compatibility coverage.

## Acceptance criteria

- [ ] Every Nest REST route has an explicit ownership/consumer classification.
- [ ] None of the 14 audited routes remains unexplained.
- [ ] Browser/system endpoints are distinguished from ordinary Angular HTTP APIs.
- [ ] Any removed route has no remaining code/test/doc/config consumer.
- [ ] Route inventory/gate is repeatable and versioned.
- [ ] Nest/Angular builds and affected tests pass.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

Run the route inventory/ownership check, Nest build/tests and Angular build/tests. Verify nginx health/static/API paths are not falsely classified as ordinary client HTTP consumers.

## Browser validation

For any route classified as browser-driven, validate the relevant local flow through `http://localhost:8888` with Chrome DevTools MCP when it can be exercised safely without production credentials. Health/static endpoints may be inspected directly through the same edge.

## Stop conditions

Block removal of any route whose ownership cannot be proven from repository evidence and for which external usage is plausible. Mark it `needs-human-classification` (or equivalent) in the inventory and record the exact evidence gap.

## Dependencies

- None.
- Advisory: coordinate the final inventory format with `0021-add-rest-contract-compatibility-suite.md`.

## Implementation notes

The useful deliverable is not just deletion; it is an auditable map explaining why every endpoint exists.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not started / not applicable per route._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._
