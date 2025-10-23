import { gql } from "apollo-angular";

export const PAGINATED_MOLECULE_COLLECTIONS = gql`
  query PaginatedCollections($page: Int!, $limit: Int!, $q: String!) {
    myMoleculeCollectionsPaginated(page: $page, limit: $limit, q: $q) {
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

export const MARK_MOLECULE_COLLECTION_AS_TOUCHED = gql`
  mutation MarkMoleculeCollectionAsTouched($id: ID!) {
    markMoleculeCollectionAsTouched(id: $id)
  }
`
