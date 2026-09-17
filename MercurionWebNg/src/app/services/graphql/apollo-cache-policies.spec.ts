import {
  MyMoleculeCollectionsDocument,
  PaginatedCollectionsDocument
} from '../../generated/graphql';
import {
  clearMercurionUserCache,
  createMercurionApolloCache,
  MERCURION_APOLLO_TYPE_POLICIES,
  mergePaginatedResults
} from './apollo-cache-policies';

describe('Mercurion Apollo cache policies', () => {
  it('normalizes stable entities by their schema identifiers', () => {
    const cache = createMercurionApolloCache();

    expect(cache.identify({ __typename: 'MoleculeCollection', id: 'collection-1' }))
      .toBe('MoleculeCollection:{"id":"collection-1"}');
    expect(cache.identify({ __typename: 'Ticket', id: 'ticket-1' }))
      .toBe('Ticket:{"id":"ticket-1"}');
  });

  it('merges later pages without duplicate entities', () => {
    const merged = mergePaginatedResults(
      {
        currentPage: 1,
        items: [
          { __typename: 'MoleculeCollection', id: 'one' },
          { __typename: 'MoleculeCollection', id: 'two' }
        ]
      },
      {
        currentPage: 2,
        items: [
          { __typename: 'MoleculeCollection', id: 'two' },
          { __typename: 'MoleculeCollection', id: 'three' }
        ]
      },
      { args: { page: 2 } }
    );

    expect(merged.items).toEqual([
      { __typename: 'MoleculeCollection', id: 'one' },
      { __typename: 'MoleculeCollection', id: 'two' },
      { __typename: 'MoleculeCollection', id: 'three' }
    ]);
  });

  it('keeps independent filter identities in separate cache entries', () => {
    const cache = createMercurionApolloCache();
    cache.writeQuery({
      query: PaginatedCollectionsDocument,
      variables: { page: 1, limit: 20, q: 'alpha' },
      data: {
        myMoleculeCollectionsPaginated: {
          currentPage: 1,
          items: [{
            id: 'alpha',
            name: 'Alpha',
            createdAt: '',
            updatedAt: '',
            touchedAt: '',
            itemsCount: 0
          }],
          itemCount: 1,
          totalPages: 1,
          totalItems: 1,
          itemsPerPage: 20
        }
      }
    });
    cache.writeQuery({
      query: PaginatedCollectionsDocument,
      variables: { page: 1, limit: 20, q: 'beta' },
      data: {
        myMoleculeCollectionsPaginated: {
          currentPage: 1,
          items: [{
            id: 'beta',
            name: 'Beta',
            createdAt: '',
            updatedAt: '',
            touchedAt: '',
            itemsCount: 0
          }],
          itemCount: 1,
          totalPages: 1,
          totalItems: 1,
          itemsPerPage: 20
        }
      }
    });

    expect(cache.readQuery<{ myMoleculeCollectionsPaginated: { items: Array<{ id: string }> } }>({
      query: PaginatedCollectionsDocument,
      variables: { page: 1, limit: 20, q: 'alpha' }
    })?.myMoleculeCollectionsPaginated.items.map(item => item.id)).toEqual(['alpha']);
    expect(cache.readQuery<{ myMoleculeCollectionsPaginated: { items: Array<{ id: string }> } }>({
      query: PaginatedCollectionsDocument,
      variables: { page: 1, limit: 20, q: 'beta' }
    })?.myMoleculeCollectionsPaginated.items.map(item => item.id)).toEqual(['beta']);
  });

  it('resets accumulated pages when the first page of a filter is written', () => {
    const first = mergePaginatedResults(
      { currentPage: 2, items: [{ __typename: 'MoleculeCollection', id: 'old' }] },
      { currentPage: 1, items: [{ __typename: 'MoleculeCollection', id: 'new' }] },
      { args: { page: 1 } }
    );

    expect(first.items).toEqual([{ __typename: 'MoleculeCollection', id: 'new' }]);
  });

  it('invalidates affected list fields from mutation completion policies', () => {
    const cache = createMercurionApolloCache();
    cache.writeQuery({
      query: MyMoleculeCollectionsDocument,
      data: {
        myMoleculeCollections: [{ id: 'one', name: 'One' }]
      }
    });

    const mutationPolicy = MERCURION_APOLLO_TYPE_POLICIES['Mutation']?.fields?.['createMoleculeCollection'];
    if (!mutationPolicy || typeof mutationPolicy === 'boolean' || typeof mutationPolicy === 'function') {
      fail('createMoleculeCollection must expose a field policy');
      return;
    }
    if (typeof mutationPolicy.merge !== 'object' && typeof mutationPolicy.merge !== 'function') {
      fail('createMoleculeCollection must expose a merge policy');
      return;
    }
    const merge = mutationPolicy.merge;
    if (typeof merge !== 'function') {
      fail('createMoleculeCollection must expose a callable merge policy');
      return;
    }
    merge(undefined, { id: 'two', name: 'Two' }, {
      cache,
      args: {},
      fieldName: 'createMoleculeCollection',
      isReference: () => false,
      variables: {}
    } as never);

    expect(cache.readQuery({ query: MyMoleculeCollectionsDocument })).toBeNull();
  });

  it('removes user-owned roots on a session transition', () => {
    const cache = createMercurionApolloCache();
    cache.writeQuery({
      query: MyMoleculeCollectionsDocument,
      data: {
        myMoleculeCollections: [{ id: 'one', name: 'One' }]
      }
    });

    clearMercurionUserCache(cache);

    expect(cache.readQuery({ query: MyMoleculeCollectionsDocument })).toBeNull();
  });
});
