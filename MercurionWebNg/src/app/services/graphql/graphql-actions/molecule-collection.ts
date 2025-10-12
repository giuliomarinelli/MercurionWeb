import { gql } from "apollo-angular";

export const PAGINATED_MOLECULE_COLLECTIONS = gql`
      query PaginatedCollections($page: Int!, $limit: Int!, $search: String) {
        myMoleculeCollectionsPaginated(page: $page, limit: $limit, search: $search) {
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
