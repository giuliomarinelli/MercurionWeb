// ---------- GQL ----------

import { gql } from "apollo-angular";

// Attenzione: campi richiesti dal template inclusi dentro i frammenti
export const MY_MOLECULE_ITEMS = gql`
  query MyMoleculeItems {
    myMoleculeItems {
      __typename
      ... on ChEMBLMoleculeItemDTO {
        id
        label
        notes
        type
        createdAt
        updatedAt
        touchedAt
        joins { id collection { id name } }
        chemblMolregno
        chemblDetails {
          id
          cmbId
          preferredName
          canonicalSmiles
          moleculeType
          maxPhase
          naturalProduct
          prodrug
          blackBoxWarning
          synonyms
          properties { mwFreebase alogp hba hbd psa rtb }
          administrationRoutes { oral parenteral topical }
        }
      }
      ... on CustomMoleculeItemDTO {
        id
        label
        notes
        type
        createdAt
        updatedAt
        touchedAt
        joins { id collection { id name } }
        canonicalSmiles
        molFormula
        name
        propertiesJson
      }
    }
  }
`;

export const ALL_BASIC_DATA = gql`
  query MyMoleculeItems {
    myMoleculeItems {
      __typename
      ... on ChEMBLMoleculeItemDTO {
        id
        type
        chemblDetails {
          preferredName
          canonicalSmiles
        }
      }
      ... on CustomMoleculeItemDTO {
        id
        type
        name
        canonicalSmiles
      }
    }
  }
`

export const MOLECULE_ITEM = gql`
  query MoleculeItem($id: ID!) {
    moleculeItem(id: $id) {
      __typename
      ... on ChEMBLMoleculeItemDTO {
        id
        label
        notes
        type
        createdAt
        updatedAt
        touchedAt
        joins { id collection { id name createdAt updatedAt itemsCount } }
        chemblMolregno
        chemblDetails {
          id
          cmbId
          preferredName
          canonicalSmiles
          moleculeType
          maxPhase
          naturalProduct
          prodrug
          blackBoxWarning
          synonyms
          properties { mwFreebase alogp hba hbd psa rtb }
          administrationRoutes { oral parenteral topical }
        }
      }
      ... on CustomMoleculeItemDTO {
        id
        label
        notes
        type
        createdAt
        updatedAt
        touchedAt
        joins { id collection { id name createdAt updatedAt itemsCount } }
        canonicalSmiles
        molFormula
        name
        propertiesJson
      }
    }
  }
`;

export const MOLECULE_ITEM_FRAG_SHORT = gql`
  query MoleculeItemShort($id: ID!) {
    moleculeItem(id: $id) {
      __typename
      ... on ChEMBLMoleculeItemDTO { id type chemblMolregno }
      ... on CustomMoleculeItemDTO { id type }
    }
  }
`;


export const PAGINATED_MOLECULE_ITEMS_FOR_CARD_BY_COLLECTION = gql`
query PaginatedMoleculeCollectionItemsByCollection($collectionId: String!, $page: Int!, $limit: Int!, $q: String!) {
    paginatedMoleculeCollectionItemsByCollection(
        collectionId: $collectionId
        page: $page
        limit: $limit
        q: $q
    ) {
        items {
            ... on CustomMoleculeItemDTO {
                id
                type
                canonicalSmiles
                name
                propertiesJson
                createdAt
                updatedAt
                touchedAt
            }
            ... on ChEMBLMoleculeItemDTO {
                id
                type
                createdAt
                updatedAt
                touchedAt
                chemblDetails {
                    preferredName
                    canonicalSmiles
                    maxPhase
                    synonyms
                    properties {
                        mwFreebase
                    }
                }
                chemblMolregno
            }
        }
        itemCount
        totalItems
        itemsPerPage
        totalPages
        currentPage
    }
}
`
export const ALL_PAGINATED_MOLECULE_ITEMS_FOR_CARD = gql`
query PaginatedMoleculeCollectionItemsByUser($page: Int!, $limit: Int!, $q: String!) {
    paginatedMoleculeCollectionItemsByUser(page: $page, limit: $limit, q: $q) {
        items {
            ... on CustomMoleculeItemDTO {
                id
                type
                canonicalSmiles
                name
                propertiesJson
                createdAt
                updatedAt
                touchedAt
            }
            ... on ChEMBLMoleculeItemDTO {
                id
                type
                createdAt
                updatedAt
                touchedAt
                chemblDetails {
                    preferredName
                    canonicalSmiles
                    maxPhase
                    synonyms
                    properties {
                        mwFreebase
                    }
                }
                chemblMolregno
            }
        }
        itemCount
        totalItems
        itemsPerPage
        totalPages
        currentPage
    }
}

`
// hasUserChEMBLMoleculeByMolregnoThenGetUUID
export const HAS_USER_CHEMBL_MOLECULE_BY_MOLREGNO_THEN_GET_UUID = gql`
  query HasUserChEMBLMoleculeByMolregnoThenGetUUID($molregno: Int!) {
    hasUserChEMBLMoleculeByMolregnoThenGetUUID(molregno: $molregno)
}
`

export const EXISTS_CHEMBL_MOLECULE_BY_UUID_THEN_GET_MOLREGNO = gql`
  query ExistsChEMBLMoleculeByUUIDThenGetMolregno($_uuid_: String!) {
    existsChEMBLMoleculeByUUIDThenGetMolregno(_uuid_: $_uuid_)
}
`

export const CREATE_MOLECULE_ITEM = gql`
  mutation CreateMoleculeItem($input: CreateMoleculeItemInput!) {
    createMoleculeItem(input: $input) {
      __typename
      ... on ChEMBLMoleculeItemDTO {
        id
        label
        notes
        type
        createdAt
        updatedAt
        touchedAt
        joins { id collection { id name } }
        chemblMolregno
        chemblDetails {
          id
          cmbId
          preferredName
          canonicalSmiles
          moleculeType
          maxPhase
          naturalProduct
          prodrug
          blackBoxWarning
          synonyms
          properties { mwFreebase alogp hba hbd psa rtb }
          administrationRoutes { oral parenteral topical }
        }
      }
      ... on CustomMoleculeItemDTO {
        id
        label
        notes
        type
        createdAt
        updatedAt
        touchedAt
        joins { id collection { id name } }
        canonicalSmiles
        molFormula
        name
        propertiesJson
      }
    }
  }
`;

export const UPDATE_MOLECULE_ITEM = gql`
  mutation UpdateMoleculeItem($id: ID!, $input: CreateMoleculeItemInput!) {
    updateMoleculeItem(id: $id, input: $input) {
      __typename
      ... on ChEMBLMoleculeItemDTO {
        id
        label
        notes
        type
        createdAt
        updatedAt
        touchedAt
        joins { id collection { id name } }
        chemblMolregno
        chemblDetails {
          id
          cmbId
          preferredName
          canonicalSmiles
          moleculeType
          maxPhase
          naturalProduct
          prodrug
          blackBoxWarning
          synonyms
          properties { mwFreebase alogp hba hbd psa rtb }
          administrationRoutes { oral parenteral topical }
        }
      }
      ... on CustomMoleculeItemDTO {
        id
        label
        notes
        type
        createdAt
        updatedAt
        touchedAt
        joins { id collection { id name } }
        canonicalSmiles
        molFormula
        name
        propertiesJson
      }
    }
  }
`;

export const UPDATE_MOLECULE_ITEM_LABEL = gql`
  mutation UpdateMoleculeItemLabel($id: ID!, $label: String!, $type: String!) {
    updateMoleculeItem(id: $id, input: { label: $label, type: $type }) {
      id
      type
      label
    }
  }
`;

export const UPDATE_MOLECULE_ITEM_NAME = gql`
  mutation UpdateMoleculeItemLabel($id: ID!, $name: String!, $type: String!) {
    updateMoleculeItem(id: $id, input: { name: $name, type: $type }) {
      id
      type
      ... on CustomMoleculeItemEntity {
        name
      }
    }
  }
`;

export const UPDATE_MOLECULE_ITEM_SMILES = gql`
  mutation UpdateMoleculeItemLabel($id: ID!, $canonicalSmiles: String!, $type: String!, $propertiesJson: String!) {
    updateMoleculeItem(id: $id, input: { canonicalSmiles: $canonicalSmiles, type: $type, propertiesJson: $propertiesJson }) {
      id
      type
      ... on CustomMoleculeItemEntity {
        canonicalSmiles
        propertiesJson
      }
    }
  }
`;

export const UPDATE_MOLECULE_ITEM_NOTES = gql`
  mutation UpdateMoleculeItemLabel($id: ID!, $notes: String!, $type: String!) {
    updateMoleculeItem(id: $id, input: { notes: $notes, type: $type }) {
      id
      type
      notes
    }
  }
`;

export const MARK_MOLECULE_COLLECTION_ITEM_AS_TOUCHED = gql`
  mutation MarkMoleculeCollectionItemAsTouched($id: ID!, $flagIds: String!) {
    markMoleculeCollectionItemAsTouched(id: $id, flagIds: $flagIds)
  }

`



export const DELETE_MOLECULE_ITEM = gql`
  mutation DeleteMoleculeItem($id: ID!) {
    deleteMoleculeItem(id: $id)
  }
`;
