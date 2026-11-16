# Database integrity inventory

This inventory records the production invariants and query-backed indexes owned
by DATA-002. Notebook ordering remains outside this task.

| Domain/table | Database invariant | Workload/index rationale |
| --- | --- | --- |
| `auth_identities` | `(provider, provider_subject)` is unique; `user_id` references `users` with cascade deletion | SSO resolves identities by provider/subject and enumerates a user's provider identities |
| `molecule_collections` | UUID primary key; `(id, user_id)` is a candidate ownership key | Collection lists filter by user and sort by name or recent touch |
| `molecule_collection_items` | UUID primary key; `(id, user_id)` is a candidate ownership key | Item lists filter by user and sort by recent touch; subtype-specific identity remains application-owned until its normalization rules are explicit |
| `molecule_collection_items_join` | Unique `(user_id, collection_id, item_id)`; composite foreign keys require both parents to have the same owner | Bulk binding uses both user/collection/item and the reverse user/item/collection lookup |
| `synthesis_pool_collections` | Unique `(synthesis_id, collection_id)` with explicit cascade foreign keys | Existing pool replacement reads by synthesis and user |
| `synthesis_pool_molecules` | Unique `(synthesis_id, molecule_id)` with cascade/restrict foreign keys | Existing pool replacement reads by synthesis and user |
| `synth_steps` | Unique route order and non-negative order | Route reads sort steps by order |
| `synth_step_items` | Unique position/order per step; closed kind/position values; non-negative order | Step rendering reads by step/user and sorts by position/order |
| Help tickets/messages | Public IDs are unique and messages cascade with their ticket | Ticket/message lists already have user/time and ticket/time indexes |
| History | No new uniqueness rule: repeated history entries are legitimate | Current history query behavior remains application-owned pending its dedicated read-model task |

The ownership backfill treats collection and item ownership as authoritative.
It repairs a stale denormalized join owner when both parents agree, and removes
an association when the parents themselves have different owners because that
association is already forbidden by the application domain.
