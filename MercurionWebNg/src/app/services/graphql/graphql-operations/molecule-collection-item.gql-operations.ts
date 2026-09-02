// ---------- GQL ----------

import { gql } from "apollo-angular";

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

export const SEARCH_CHEMBL_MOLECULES_EXCLUDE_ALREADY_ADDED = gql`
  query MoleculeSearch_excludeAlreadyAdded($input: MoleculeSearchInput!, $collectionId: ID!) {
    moleculeSearch_excludeAlreadyAdded(input: $input, collectionId: $collectionId) {
      id
      preferredName
      preferredNameIt
      smiles
      synonyms
      mwFreebase
      alogp
      maxPhase
      known
    }
  }
`

export const FIND_ONE_CUSTOM_MOLECULE_BY_CS_SHORT_FETCH = gql`
  query FindOneCustomMoleculeByCanonicalSmiles($canonicalSmiles: String!) {
    findOneCustomMoleculeByCanonicalSmiles(canonicalSmiles: $canonicalSmiles) {
        id
        type
        canonicalSmiles
        name
    }
  }
`

export const ADD_MANY_CHEMBL_ITEMS_TO_COLLECTION = gql`
  mutation AddManyChemblItemsToCollection($collectionId: ID!, $input: [AddManyChEMBLItemDTO!]!) {
    addManyChemblItemsToCollection(
        collectionId: $collectionId
        input: $input
    )
}

`


export const ADD_MANY_MOLECULES_TO_COLLECTION = gql`
  mutation AddManyMoleculesToCollection($collectionId: ID!, $itemIds: [ID!]!, $selectAll: Boolean!) {
    addManyMoleculesToCollection(collectionId: $collectionId, itemIds: $itemIds, selectAll: $selectAll)
  }
`

export const REMOVE_MOLECULE_FROM_COLLECTION = gql`
  mutation RemoveMoleculeFromCollection($collectionId: ID!, $itemId: ID!, $deleteCollectionIfEmpty: Boolean) {
    removeMoleculeFromCollection(collectionId: $collectionId, itemId: $itemId, deleteCollectionIfEmpty: $deleteCollectionIfEmpty)
  }
`

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
