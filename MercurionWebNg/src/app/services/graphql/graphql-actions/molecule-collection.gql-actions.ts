import { gql } from "apollo-angular";

export const PAGINATED_MOLECULE_COLLECTIONS = gql`
  query PaginatedCollections($page: Int!, $limit: Int!, $q: String!, $excludeJoinedToMolecule: Boolean, $moleculeId: ID) {
    myMoleculeCollectionsPaginated(page: $page, limit: $limit, q: $q, excludeJoinedToMolecule: $excludeJoinedToMolecule, moleculeId: $moleculeId) {
      items {
        id
        name
        createdAt
        updatedAt
        touchedAt
        itemsCount
      }
      totalPages
      totalItems
      currentPage
    }
  }
    `;

export const CREATE_MANY_MOLECULE_COLLECTIONS = gql`
  mutation CreateManyMoleculeCollections($names: [String!]!) {
    createManyMoleculeCollections(names: $names)
}
`

export const MARK_MOLECULE_COLLECTION_AS_TOUCHED = gql`
  mutation MarkMoleculeCollectionAsTouched($id: ID!) {
    markMoleculeCollectionAsTouched(id: $id)
  }
`

export const UPDATE_MOLECULE_COLLECTION_NAME = gql`
  mutation UpdateMoleculeCollection($id: ID!, $name: String!) {
    updateMoleculeCollection(id: $id, name: $name) {
        id
        name
    }
}
`
