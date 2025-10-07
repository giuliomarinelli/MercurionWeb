import { T1PredictionDTO } from "../../notebook/t1-prediction-model";
import { MoleculeDetail, MoleculeDetailSystem } from "../molecule.detail";

// --- TYPE DEFINITIONS (semplificate) ---
export interface MoleculeCollectionJoin {
  id: string;
  collection: { id: string; name: string; };
}
export interface BaseMoleculeItem {
  id: string;
  label?: string | null;
  notes?: string | null;
  type: 'chembl' | 'custom';
  joins: MoleculeCollectionJoin[];
  createdAt: string
  updatedAt: string
  t1Inference?: T1PredictionDTO
}
export interface ChEMBLMoleculeItemEntity extends BaseMoleculeItem {
  type: 'chembl';
  chemblMolregno: number;
  chemblDetails: MoleculeDetail

}
export interface CustomMoleculeItemEntity extends BaseMoleculeItem {
  type: 'custom';
  canonicalSmiles: string;
  molFormula?: string | null;
  name?: string | null;
  propertiesJson?: string | null;
  properties?: MoleculeProperties
}


export interface MoleculeCollectionItemEntityShort {
  id: string
  type: string
  chemblMolregno?: number
}

export interface CreateMoleculeItemInput {
  type: 'chembl' | 'custom';
  canonicalSmiles?: string;
  molFormula?: string;
  name?: string;
  propertiesJson?: string;
  chemblMolregno?: number;
  label?: string;
  notes?: string;
}

export interface CustomMoleculeItemInput {
  canonicalSmiles: string;
  label?: string;
  notes?: string;
  molFormula?: string;
  name?: string;
  propertiesJson?: string; // da serializzare via JSON.stringify(properties)
}

// export interface CustomMoleculeItemEntity {
//   id: string;
//   type: 'custom';
//   label?: string | null;
//   notes?: string | null;
//   canonicalSmiles: string;
//   molFormula?: string | null;
//   name?: string | null;
//   propertiesJson?: string | null;
//   joins: { id: string; collection: { id: string; name: string } }[];
//   // Getter derivato (non in DB, aggiunto in UI):
//   properties?: MoleculeProperties | null;
// }

export interface AddCustomMoleculeToCollectionInput {
  collectionId: string;
  input: CustomMoleculeItemInput;
}

export interface AddChemblMoleculeToCollectionInput {
  collectionId: string;
  chemblMolregno: number;
  label?: string;
  notes?: string;
}

export interface MoleculeProperties {
  mwFreebase: number | string;
  alogp: number | string;
  hba: number;
  hbd: number;
  psa: number | string;
  rtb: number;
}
export type MoleculeItemDTO =
  | {
      __typename: 'ChEMBLMoleculeItemDTO';
      id: string; label?: string | null; notes?: string | null;
      joins: { id: string; collection: { id: string; name: string } }[];
      chemblMolregno: number;
    }
  | {
      __typename: 'CustomMoleculeItemDTO';
      id: string; label?: string | null; notes?: string | null;
      joins: { id: string; collection: { id: string; name: string } }[];
      canonicalSmiles: string;
      molFormula?: string | null;
      name?: string | null;
      propertiesJson?: string | null;
    };

export type MoleculeCollectionItemClient =
  | {
      id: string;
      label?: string | null;
      notes?: string | null;
      type: 'chembl';
      joins: { id: string; collection: { id: string; name: string } }[];
      chemblMolregno: number;
      createdAt?: string; updatedAt?: string; chemblDetails?: unknown;
    }
  | {
      id: string;
      label?: string | null;
      notes?: string | null;
      type: 'custom';
      joins: { id: string; collection: { id: string; name: string } }[];
      canonicalSmiles: string;
      molFormula?: string | null;
      name?: string | null;
      propertiesJson?: string | null;
      createdAt?: string; updatedAt?: string;
    };

export interface MoleculeCollectionItemEntityShort {
  id: string;
  type: 'chembl' | 'custom'; // NON string generico
  chemblMolregno?: number;
}

// Polimorfico nel componente
export type MoleculeDetailItem = MoleculeDetailSystem | MoleculeCollectionItemClient;
