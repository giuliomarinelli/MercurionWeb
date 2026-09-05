# Angular GraphQL query lifecycle and fetch-policy contract

All current production reads are one-shot `Apollo.query(...)` calls. A service
observable represents one requested snapshot and completes after Apollo returns
that result. Components and feature flows request a new snapshot explicitly
after a mutation; there is no anonymous global refetch tick.

## Fetch-policy decision table

| Use case | Lifecycle | Policy | Rationale |
| --- | --- | --- | --- |
| Stable reference data, such as ChEMBL molecule detail/previews | One-shot | `cache-first` | Reusing normalized reference data is safe; a cache miss fetches it. |
| Mutable user-owned or operational data | One-shot | `network-only` | Each explicit load/refresh must observe current server state while still updating normalized entities in the Apollo cache. |
| Ephemeral search/validation result that should not populate the cache | One-shot | `no-cache` | Use only when the result has no reusable entity value. No current production query requires this policy. |
| Feature-owned live/reactive view | Watched | `cache-and-network` | Permitted only when repeated cache/refetch emissions are part of the feature contract and the call site declares its owner and teardown. |
| Security-sensitive or explicitly uncached read | One-shot | `no-cache` | Requires a domain-specific rationale at the call site. |

`network-only` is not a watcher default. The static query-policy gate rejects
all undocumented watchers and specifically requires an explicit machine-readable
allowance for a retained `network-only` watcher.

## Production query inventory

| Operation | Service method | Classification | Policy | Freshness invariant |
| --- | --- | --- | --- | --- |
| `MyTicketDetail` | `HelpService.myTicketDetail` | One-shot mutable snapshot | `network-only` | Ticket state/messages can change through user or support actions. |
| `MyTickets` | `HelpService.myTickets` | One-shot paginated snapshot | `network-only` | Ticket list/status must reflect the latest support activity. |
| `MyTicketMessages` | `HelpService.myTicketMessages` | One-shot paginated snapshot | `network-only` | Message threads can change after either party posts. |
| `ExistsUserTicketById` | `HelpService.existsUserTicketById` | One-shot validation | `network-only` | Authorization/existence is server-owned current state. |
| `TicketDetailAsSupport` | `HelpService.ticketDetailAsSupport` | One-shot mutable snapshot | `network-only` | Support actions can change ticket state. |
| `TicketsAsSupport` | `HelpService.ticketsAsSupport` | One-shot paginated snapshot | `network-only` | Support queues must reflect current tickets/status. |
| `TicketMessagesAsSupport` | `HelpService.ticketMessagesAsSupport` | One-shot paginated snapshot | `network-only` | Message threads can change after either party posts. |
| `MoleculeItemBasicData` | `MoleculeCollectionItemService.getAllNormalizedBasicData` | One-shot mutable snapshot | `network-only` | User molecule metadata is editable. |
| `MyMoleculeItems` | `MoleculeCollectionItemService.getAllItems` | One-shot mutable snapshot | `network-only` | User items and collection joins are mutable. |
| `MoleculeItem` | `MoleculeCollectionItemService.getItemById` | One-shot mutable snapshot | `network-only` | Labels, notes, names, structures and joins are editable. |
| `MoleculeItemShort` | `MoleculeCollectionItemService.getItemShortById` | One-shot mutable snapshot | `network-only` | Item identity/type can disappear after deletion. |
| `PaginatedMoleculeCollectionItemsByCollection` | `MoleculeCollectionItemService.getPaginatedItemsForCollection` | One-shot paginated snapshot | `network-only` | Collection membership and item data are mutable. |
| `PaginatedMoleculeCollectionItemsByUser` | `MoleculeCollectionItemService.getAllPaginatedItems` | One-shot paginated snapshot | `network-only` | User inventory changes through create/update/delete/join actions. |
| `HasUserChEMBLMoleculeByMolregnoThenGetUUID` | `MoleculeCollectionItemService.hasUserChEMBLMoleculeByMolregnoThenGetUUID` | One-shot validation | `network-only` | User ownership can change. |
| `ExistsChEMBLMoleculeByUUIDThenGetMolregno` | `MoleculeCollectionItemService.existsChEMBLMoleculeByUUIDThenGetMolregno` | One-shot validation | `network-only` | User item existence can change. |
| `MoleculeSearch_ExcludeAlreadyAdded` | `MoleculeCollectionItemService.searchChemblMolecules_excludeAlreadyAdded` | One-shot search | `network-only` | Results depend on current collection membership. |
| `FindOneCustomMoleculeByCanonicalSmiles` | `MoleculeCollectionItemService.findOneCustomMoleculeByCanonicalSmiles_shortFetch` | One-shot validation | `network-only` | User-created custom molecules can change. |
| `MoleculeItem` | `MoleculeCollectionItemService.getCustomSmilesById` | One-shot mutable snapshot | `network-only` | Custom structures are editable. |
| `MyMoleculeCollections` / `MyMoleculeCollectionsWithItems` | `MoleculeCollectionService.getAllCollections` | One-shot mutable snapshot | `network-only` | Collection names, counts and membership are mutable. |
| `MoleculeCollection` / `MoleculeCollectionWithItems` | `MoleculeCollectionService.getCollectionById` | One-shot mutable snapshot | `network-only` | Collection detail and membership are mutable. |
| `PaginatedCollections` | `MoleculeCollectionService.getPaginatedCollections` | One-shot paginated snapshot | `network-only` | Search results depend on current collections and joins. |
| `MoleculeSearch` | `MoleculeSearchService.searchMolecule` | One-shot search | `network-only` | Search must reflect the current upstream catalogue. |
| `GetMoleculeDetail` | `MoleculeService.getMoleculeByMolregno` | One-shot stable reference | `cache-first` | ChEMBL reference identity/detail is treated as stable for a browser session. |
| `MoleculePreviewsByMolregnos` | `MoleculeService.getMoleculePreviewsByMolregnos` | One-shot stable reference | `cache-first` | ChEMBL previews are reusable reference data. |
| `GetAllNotebooks` | `NotebookService.getAllNotebooks` | One-shot mutable snapshot | `network-only` | Notebook trees are user-editable. |
| `GetNotebookDetail` | `NotebookService.getNotebookById` | One-shot mutable snapshot | `network-only` | Notebook content is user-editable. |
| `GetChapterById` | `NotebookService.getChapterById` | One-shot mutable snapshot | `network-only` | Chapter title/content relationships are user-editable. |
| `GetSectionById` | `NotebookService.getSectionById` | One-shot mutable snapshot | `network-only` | Section title/content relationships are user-editable. |
| `GetPageHeaderById` | `NotebookService.getPageByIdHeader` | One-shot mutable snapshot | `network-only` | Page headers are user-editable. |

## Retained watcher annotation

There are currently no retained production watchers. If a future feature
requires one, put this machine-readable annotation immediately before the
`watchQuery` call:

```ts
// graphql-watch: policy=cache-and-network owner=FeatureFacade teardown=destroyRef reason=live-feature-contract
```

For the exceptional `network-only` watcher case, the annotation must also
contain `allow-network-only=true`.

