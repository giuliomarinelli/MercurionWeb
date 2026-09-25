import {
  ApolloCache,
  FieldFunctionOptions,
  FieldPolicy,
  InMemoryCache,
  TypePolicies
} from '@apollo/client/core';
import { InjectionToken } from '@angular/core';

type CacheObject = Record<string, unknown>;
type PaginatedResult = CacheObject & { items?: readonly unknown[] };

export const MERCURION_APOLLO_CACHE = new InjectionToken<ApolloCache<unknown>>('MERCURION_APOLLO_CACHE');

const PAGINATED_QUERY_FIELDS = [
  'myMoleculeCollectionsPaginated',
  'paginatedMoleculeCollectionItemsByCollection',
  'paginatedMoleculeCollectionItemsByUser',
  'myTickets',
  'myTicketMessages',
  'ticketsAsSupport',
  'ticketMessagesAsSupport'
] as const;

const USER_OWNED_QUERY_FIELDS = [
  'myMoleculeCollections',
  'myMoleculeCollectionsPaginated',
  'myMoleculeItems',
  'paginatedMoleculeCollectionItemsByCollection',
  'paginatedMoleculeCollectionItemsByUser',
  'labNotebooksByUser',
  'myTickets',
  'myTicketMessages',
  'myTicketDetail',
  'ticketsAsSupport',
  'ticketMessagesAsSupport'
] as const;

const invalidatingMutation = (
  fields: readonly string[],
  evictArgumentId?: string,
  evictTypename: string | readonly string[] = 'MoleculeCollection'
): FieldPolicy<unknown> => ({
  merge(existing, incoming, options) {
    const cache = options.cache;
    if (evictArgumentId) {
      const id = options.args?.[evictArgumentId];
      if (typeof id === 'string' || typeof id === 'number') {
        const typenames = Array.isArray(evictTypename) ? evictTypename : [evictTypename];
        for (const typename of typenames) {
          const cacheId = cache.identify({ __typename: typename, id });
          if (cacheId) cache.evict({ id: cacheId });
        }
      }
    }
    for (const fieldName of fields) {
      cache.evict({ id: 'ROOT_QUERY', fieldName });
    }
    cache.gc();
    return incoming;
  }
});

export const mergePaginatedResults = (
  existing: PaginatedResult | undefined,
  incoming: PaginatedResult,
  options: Pick<FieldFunctionOptions, 'args'>
): PaginatedResult => {
  const page = Number(options.args?.['page'] ?? incoming['currentPage'] ?? 1);
  if (!existing || page <= 1) {
    return { ...incoming, items: dedupeItems(incoming.items ?? []) };
  }

  return {
    ...existing,
    ...incoming,
    items: dedupeItems([
      ...(existing.items ?? []),
      ...(incoming.items ?? [])
    ])
  };
};

function dedupeItems(items: readonly unknown[]): readonly unknown[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const identity = itemIdentity(item);
    if (!identity) return true;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function itemIdentity(item: unknown): string | null {
  if (item && typeof item === 'object') {
    const value = item as { __ref?: unknown; __typename?: unknown; id?: unknown };
    if (typeof value.__ref === 'string') return value.__ref;
    if (typeof value.__typename === 'string' && (typeof value.id === 'string' || typeof value.id === 'number')) {
      return `${value.__typename}:${value.id}`;
    }
  }
  return null;
}

const paginatedField = (keyArgs: readonly string[]): FieldPolicy<PaginatedResult> => ({
  keyArgs,
  merge: mergePaginatedResults
});

export const MERCURION_APOLLO_TYPE_POLICIES: TypePolicies = {
  MoleculeCollection: { keyFields: ['id'] },
  ChEMBLMoleculeItemDTO: { keyFields: ['id'] },
  CustomMoleculeItemDTO: { keyFields: ['id'] },
  MoleculeCollectionItemJoin: { keyFields: ['id'] },
  MoleculeDetail: { keyFields: ['id'] },
  LabNotebook: { keyFields: ['id'] },
  NotebookChapter: { keyFields: ['id'] },
  NotebookSection: { keyFields: ['id'] },
  NotebookPage: { keyFields: ['id'] },
  LabNotebookLinkType: { keyFields: ['id'] },
  Ticket: { keyFields: ['id'] },
  TicketMessage: { keyFields: ['id'] },
  MoleculeProperties: { keyFields: false },
  MoleculeSearchResult: { keyFields: false },
  Query: {
    fields: {
      myMoleculeCollectionsPaginated: paginatedField(['limit', 'q', 'excludeJoinedToMolecule', 'moleculeId']),
      paginatedMoleculeCollectionItemsByCollection: paginatedField(['collectionId', 'limit', 'q']),
      paginatedMoleculeCollectionItemsByUser: paginatedField(['collectionId', 'excludeJoinedToCollection', 'limit', 'q']),
      myTickets: paginatedField(['limit']),
      myTicketMessages: paginatedField(['limit', 'ticketId']),
      ticketsAsSupport: paginatedField(['limit']),
      ticketMessagesAsSupport: paginatedField(['limit', 'ticketId'])
    }
  },
  Mutation: {
    fields: {
      createMoleculeCollection: invalidatingMutation(['myMoleculeCollections', 'myMoleculeCollectionsPaginated']),
      createManyMoleculeCollections: invalidatingMutation(['myMoleculeCollections', 'myMoleculeCollectionsPaginated']),
      updateMoleculeCollection: invalidatingMutation(['myMoleculeCollectionsPaginated']),
      deleteMoleculeCollection: invalidatingMutation(['myMoleculeCollections', 'myMoleculeCollectionsPaginated'], 'id'),
      duplicateCollection: invalidatingMutation(['myMoleculeCollections', 'myMoleculeCollectionsPaginated']),
      bindManyCollectionsToMolecule: invalidatingMutation([
        'myMoleculeCollections',
        'myMoleculeCollectionsPaginated',
        'myMoleculeItems',
        'paginatedMoleculeCollectionItemsByCollection',
        'paginatedMoleculeCollectionItemsByUser'
      ]),
      createMoleculeItem: invalidatingMutation([
        'myMoleculeItems',
        'paginatedMoleculeCollectionItemsByCollection',
        'paginatedMoleculeCollectionItemsByUser'
      ]),
      updateMoleculeItem: invalidatingMutation(['paginatedMoleculeCollectionItemsByCollection', 'paginatedMoleculeCollectionItemsByUser']),
      deleteMoleculeItem: invalidatingMutation([
        'myMoleculeItems',
        'paginatedMoleculeCollectionItemsByCollection',
        'paginatedMoleculeCollectionItemsByUser'
      ], 'id', ['ChEMBLMoleculeItemDTO', 'CustomMoleculeItemDTO']),
      addManyChemblItemsToCollection: invalidatingMutation(['myMoleculeItems', 'paginatedMoleculeCollectionItemsByCollection', 'paginatedMoleculeCollectionItemsByUser']),
      addManyMoleculesToCollection: invalidatingMutation(['myMoleculeItems', 'paginatedMoleculeCollectionItemsByCollection', 'paginatedMoleculeCollectionItemsByUser']),
      removeMoleculeFromCollection: invalidatingMutation(['myMoleculeItems', 'paginatedMoleculeCollectionItemsByCollection', 'paginatedMoleculeCollectionItemsByUser']),
      createLabNotebook: invalidatingMutation(['labNotebooksByUser']),
      updateLabNotebook: invalidatingMutation(['labNotebooksByUser']),
      deleteLabNotebook: invalidatingMutation(['labNotebooksByUser']),
      createChapter: invalidatingMutation(['labNotebooksByUser']),
      updateChapter: invalidatingMutation(['labNotebooksByUser']),
      deleteChapter: invalidatingMutation(['labNotebooksByUser']),
      createSection: invalidatingMutation(['labNotebooksByUser']),
      updateSection: invalidatingMutation(['labNotebooksByUser']),
      deleteSection: invalidatingMutation(['labNotebooksByUser']),
      createPage: invalidatingMutation(['labNotebooksByUser']),
      updatePage: invalidatingMutation(['labNotebooksByUser']),
      deletePage: invalidatingMutation(['labNotebooksByUser']),
      createTicket: invalidatingMutation(['myTickets']),
      addTicketMessage: invalidatingMutation(['myTickets', 'myTicketDetail', 'myTicketMessages']),
      closeMyTicket: invalidatingMutation(['myTickets', 'myTicketDetail']),
      addSupportTicketMessage: invalidatingMutation(['ticketsAsSupport', 'ticketMessagesAsSupport', 'ticketDetailAsSupport']),
      closeTicketAsSupport: invalidatingMutation(['ticketsAsSupport', 'ticketMessagesAsSupport', 'ticketDetailAsSupport']),
      reopenTicketAsSupport: invalidatingMutation(['ticketsAsSupport', 'ticketMessagesAsSupport', 'ticketDetailAsSupport'])
    }
  }
};

export function createMercurionApolloCache(): InMemoryCache {
  return new InMemoryCache({
    possibleTypes: {
      MoleculeCollectionItemUnion: ['ChEMBLMoleculeItemDTO', 'CustomMoleculeItemDTO']
    },
    typePolicies: MERCURION_APOLLO_TYPE_POLICIES
  });
}

export function clearMercurionUserCache(cache: ApolloCache<unknown>): void {
  for (const fieldName of USER_OWNED_QUERY_FIELDS) {
    cache.evict({ id: 'ROOT_QUERY', fieldName });
  }
  cache.gc();
}

export function invalidateMercurionFields(
  cache: ApolloCache<unknown>,
  fields: readonly string[]
): void {
  for (const fieldName of fields) {
    cache.evict({ id: 'ROOT_QUERY', fieldName });
  }
  cache.gc();
}

export const MERCURION_PAGINATED_QUERY_FIELDS = PAGINATED_QUERY_FIELDS;
