import { gql } from '@apollo/client/core';
import {
  clearMercurionUserCache,
  createMercurionApolloCache,
  MERCURION_APOLLO_TYPE_POLICIES,
  mergePaginatedResults
} from './apollo-cache-policies';

describe('Mercurion Apollo cache policies', () => {
  const paginatedCollectionsQuery = gql`
    query PaginatedCollections($page: Int!, $limit: Int!, $q: String!) {
      myMoleculeCollectionsPaginated(page: $page, limit: $limit, q: $q) {
        currentPage
        items { __typename id name }
      }
    }
  `;

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
      query: paginatedCollectionsQuery,
      variables: { page: 1, limit: 20, q: 'alpha' },
      data: {
        myMoleculeCollectionsPaginated: {
          __typename: 'PaginatedMoleculeCollection',
          currentPage: 1,
          items: [{ __typename: 'MoleculeCollection', id: 'alpha', name: 'Alpha' }]
        }
      }
    });
    cache.writeQuery({
      query: paginatedCollectionsQuery,
      variables: { page: 1, limit: 20, q: 'beta' },
      data: {
        myMoleculeCollectionsPaginated: {
          __typename: 'PaginatedMoleculeCollection',
          currentPage: 1,
          items: [{ __typename: 'MoleculeCollection', id: 'beta', name: 'Beta' }]
        }
      }
    });

    expect(cache.readQuery<{ myMoleculeCollectionsPaginated: { items: Array<{ id: string }> } }>({
      query: paginatedCollectionsQuery,
      variables: { page: 1, limit: 20, q: 'alpha' }
    })?.myMoleculeCollectionsPaginated.items.map(item => item.id)).toEqual(['alpha']);
    expect(cache.readQuery<{ myMoleculeCollectionsPaginated: { items: Array<{ id: string }> } }>({
      query: paginatedCollectionsQuery,
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
      query: gql`query { myMoleculeCollections { id name } }`,
      data: {
        myMoleculeCollections: [{ __typename: 'MoleculeCollection', id: 'one', name: 'One' }]
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

    expect(cache.readQuery({ query: gql`query { myMoleculeCollections { id name } }` })).toBeNull();
  });

  it('removes user-owned roots on a session transition', () => {
    const cache = createMercurionApolloCache();
    cache.writeQuery({
      query: gql`query { myMoleculeCollections { id name } }`,
      data: {
        myMoleculeCollections: [{ __typename: 'MoleculeCollection', id: 'one', name: 'One' }]
      }
    });

    clearMercurionUserCache(cache);

    expect(cache.readQuery({ query: gql`query { myMoleculeCollections { id name } }` })).toBeNull();
  });
});
