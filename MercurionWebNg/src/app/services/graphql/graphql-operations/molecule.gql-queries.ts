import { gql } from 'apollo-angular';

export const GET_MOLECULE_DETAIL = gql`
  query GetMoleculeDetail($molregno: String!) {
    moleculeByMolregno(molregno: $molregno) {
      id
      cmbId
      preferredName
      preferredNameIt
      canonicalSmiles
      moleculeType
      maxPhase
      administrationRoutes {
        oral
        parenteral
        topical
      }
      properties {
        mwFreebase
        alogp
        hba
        hbd
        psa
        rtb
      }
      naturalProduct
      prodrug
      blackBoxWarning
      synonyms
    }
  }`

export const GET_MOLECULE_PREVIEWS = gql`
  query MoleculePreviewsByMolregnos($molregnos: [String!]!) {
    moleculePreviewsByMolregnos(molregnos: $molregnos) {
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
  } `;
