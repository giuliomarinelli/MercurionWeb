# Observability and performance gate policy

QA-031 establishes a vendor-neutral contract for diagnostics. Metrics may use
only `transport`, normalized `operation`, bounded `outcome`, status class and
the documented sample name. User identifiers, query text, payloads, subjects,
tokens and credentials are never metric labels or exported log values.

The controlled gate uses fixed local fixtures and compares a robust median
against the versioned budgets below. Warmup samples are discarded, the sample
count is fixed, and the tolerance is explicit. A budget change requires review
by the owning team and a committed evidence update; it must not be raised in
response to a single failed run.

| Workload | Median budget | Tolerance | Owner and rationale |
| --- | ---: | ---: | --- |
| authentication/session | 250 ms | 20% | Auth: protects interactive login latency |
| molecule read | 300 ms | 20% | Collections: protects the primary read path |
| molecule write | 500 ms | 20% | Collections: includes transactional persistence |
| scientific RPC | 1500 ms | 25% | Scientific adapters: includes controlled NATS fixture |

The benchmark runner reports functional failures separately from performance
regressions and writes machine-readable JSON plus a concise text summary.
