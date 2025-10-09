import { T1PredictionDTO } from "../../notebook/t1-prediction-model";
import { MoleculeDetail, MoleculeDetailSystem } from "../molecule.detail.models";

// --- TYPE DEFINITIONS (semplificate) ---
export interface MoleculeCollectionJoin {
  id: string;
  collection: MoleculeCollection
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
    id: string;
    label?: string | null;
    notes?: string | null;
    type: string;                           // esposto dal backend
    createdAt: string | number;             // backend @Field(() => String)
    updatedAt: string | number;             // backend @Field(() => String)
    joins?: { id: string; collection: MoleculeCollection }[] | null;
    chemblMolregno: string | number;        // backend lo espone come String
    chemblDetails?: MoleculeDetail | null;  // dettagli per il rendering
  }
  | {
    __typename: 'CustomMoleculeItemDTO';
    id: string;
    label?: string | null;
    notes?: string | null;
    type: string;                           // esposto dal backend
    createdAt: string | number;             // backend @Field(() => String)
    updatedAt: string | number;             // backend @Field(() => String)
    joins?: { id: string; collection: MoleculeCollection }[] | null;
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
    joins: { id: string; collection: MoleculeCollection }[];
    chemblMolregno: number;
    createdAt?: string; updatedAt?: string; chemblDetails?: unknown;
    t1Inference?: T1PredictionDTO
  }
  | {
    id: string;
    label?: string | null;
    notes?: string | null;
    type: 'custom';
    joins: { id: string; collection: MoleculeCollection }[];
    canonicalSmiles: string;
    molFormula?: string | null;
    name?: string | null;
    propertiesJson?: string | null;
    createdAt?: string; updatedAt?: string;
    t1Inference?: T1PredictionDTO
  };

export interface MoleculeCollectionItemEntityShort {
  id: string;
  type: string; // NON string generico
  chemblMolregno?: number;
}

// Polimorfico nel componente
export type MoleculeDetailItem = MoleculeDetailSystem | MoleculeCollectionItemClient;

export interface MoleculeCollectionItemJoinShort {
  id: string;
  item: { id: string; label?: string | null; type: string; };
}
export interface MoleculeCollection {
  id: string;
  name: string;
  items?: MoleculeCollectionItemJoinShort[];
}

export interface MoleculeCollection {
  id: string
  name: string
  createdAt: string | number
  updatedAt: string | number
  itemsCount: number
}
