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
        joins { id collection { id name } }
        canonicalSmiles
        molFormula
        name
        propertiesJson
      }
    }
  }
`;

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



export const DELETE_MOLECULE_ITEM = gql`
  mutation DeleteMoleculeItem($id: ID!) {
    deleteMoleculeItem(id: $id)
  }
`;
