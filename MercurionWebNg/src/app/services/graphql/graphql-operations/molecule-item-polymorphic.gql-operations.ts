import { gql } from 'apollo-angular';

export const MOLECULE_ITEM_POLYMORPHIC_OPERATIONS = gql`
  fragment MoleculeItemFields on MoleculeCollectionItemUnion {
    __typename
    ... on ChEMBLMoleculeItemDTO {
      id
      label
      notes
      type
      createdAt
      updatedAt
      touchedAt
      joins {
        id
        collection {
          id
          name
          createdAt
          updatedAt
          touchedAt
          itemsCount
        }
      }
      chemblMolregno
      chemblDetails {
        id
        cmbId
        preferredName
        preferredNameIt
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
      joins {
        id
        collection {
          id
          name
          createdAt
          updatedAt
          touchedAt
          itemsCount
        }
      }
      canonicalSmiles
      molFormula
      name
      propertiesJson
    }
  }

  query MyMoleculeItems {
    myMoleculeItems {
      ...MoleculeItemFields
    }
  }

  query MoleculeItemBasicData {
    myMoleculeItems {
      __typename
      ... on ChEMBLMoleculeItemDTO {
        id
        type
        chemblDetails {
          preferredName
          preferredNameIt
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

  query MoleculeItem($id: ID!) {
    moleculeItem(id: $id) {
      ...MoleculeItemFields
    }
  }

  query MoleculeItemShort($id: ID!) {
    moleculeItem(id: $id) {
      __typename
      ... on ChEMBLMoleculeItemDTO {
        id
        type
        chemblMolregno
      }
      ... on CustomMoleculeItemDTO {
        id
        type
      }
    }
  }

  query PaginatedMoleculeCollectionItemsByCollection(
    $collectionId: String!
    $page: Int!
    $limit: Int!
    $q: String!
  ) {
    paginatedMoleculeCollectionItemsByCollection(
      collectionId: $collectionId
      page: $page
      limit: $limit
      q: $q
    ) {
      items {
        ...MoleculeItemFields
      }
      itemCount
      totalItems
      itemsPerPage
      totalPages
      currentPage
    }
  }

  query PaginatedMoleculeCollectionItemsByUser(
    $page: Int!
    $limit: Int!
    $q: String!
    $excludeJoinedToCollection: Boolean
    $collectionId: ID
  ) {
    paginatedMoleculeCollectionItemsByUser(
      page: $page
      limit: $limit
      q: $q
      excludeJoinedToCollection: $excludeJoinedToCollection
      collectionId: $collectionId
    ) {
      items {
        ...MoleculeItemFields
      }
      itemCount
      totalItems
      itemsPerPage
      totalPages
      currentPage
    }
  }

  mutation CreateMoleculeItem($input: CreateMoleculeItemInput!) {
    createMoleculeItem(input: $input) {
      ...MoleculeItemFields
    }
  }

  mutation UpdateMoleculeItem($id: ID!, $input: CreateMoleculeItemInput!) {
    updateMoleculeItem(id: $id, input: $input) {
      ...MoleculeItemFields
    }
  }

  mutation UpdateMoleculeItemLabel($id: ID!, $label: String!, $type: String!) {
    updateMoleculeItem(id: $id, input: { label: $label, type: $type }) {
      ...MoleculeItemFields
    }
  }

  mutation UpdateMoleculeItemName($id: ID!, $name: String!, $type: String!) {
    updateMoleculeItem(id: $id, input: { name: $name, type: $type }) {
      ...MoleculeItemFields
    }
  }

  mutation UpdateMoleculeItemCanonicalSmiles(
    $id: ID!
    $canonicalSmiles: String!
    $type: String!
    $propertiesJson: String!
  ) {
    updateMoleculeItem(
      id: $id
      input: {
        canonicalSmiles: $canonicalSmiles
        type: $type
        propertiesJson: $propertiesJson
      }
    ) {
      ...MoleculeItemFields
    }
  }

  mutation UpdateMoleculeItemNotes($id: ID!, $notes: String!, $type: String!) {
    updateMoleculeItem(id: $id, input: { notes: $notes, type: $type }) {
      ...MoleculeItemFields
    }
  }
`;
