# Dependency and warning report

Inventory date: 2026-09-18. The machine-readable policy is
`dependency-exception-policy.json`; the warning capture is
`dependency-warning-report.json`.

| Package | Ownership | Scope | Decision |
| --- | --- | --- | --- |
| `@angular/animations` | Optional Angular peer metadata | Runtime metadata | Time-bounded transitive exception; no application import/provider |
| `subscriptions-transport-ws` | Apollo/Nest GraphQL compatibility metadata | Runtime metadata | Time-bounded transitive exception; application transport uses `ws` |
| `scmp` | Twilio-owned transitive helper | Runtime | Time-bounded transitive exception; no Mercurion direct import |
| `@thumbmarkjs/thumbmarkjs` | Mercurion fingerprint adapter | Runtime direct | Approved exact version `0.20.2` |
| `nats` | Mercurion typed scientific adapter | Runtime direct | Approved exact version `2.29.3` |
| `quill` | Lazy editor adapter | Runtime direct | Approved exact version `2.0.2`; CommonJS policy is separate |
| `@rdkit/rdkit` | Lazy chemistry adapter | Runtime direct | Approved exact version `2024.3.5-1.0.0`; CommonJS policy is separate |

The focused current graph contains no forbidden audited direct package and no
unaccepted deprecation warning. Every residual exception has an owner,
upstream reference, exact version, removal trigger, and 2027-03-31 deadline.
