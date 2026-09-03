import { gql } from 'apollo-angular';

export const FORBIDDEN_INLINE_DOCUMENT = gql`
  query ForbiddenInlineCatalogProbe {
    myMoleculeCollections {
      id
    }
  }
`;
