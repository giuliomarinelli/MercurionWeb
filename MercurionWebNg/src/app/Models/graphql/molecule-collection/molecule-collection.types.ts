import { WritableSignal } from "@angular/core";
import { T1PredictionDTO } from "../../notebook/t1-prediction-model";
import { MoleculeProperties } from "../molecule-properties.model";
import { MoleculeDetail, MoleculeDetailSystem } from "../molecule.detail.models";
import type {
  AddChemblMoleculeToCollectionMutationVariables,
  AddCustomMoleculeToCollectionMutationVariables,
  BindManyCollectionsToMoleculeMutation,
  DuplicateCollectionMutation,
  PaginatedCollectionsQuery
} from "../../../generated/graphql";

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
  touchedAt: string
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

export type CustomMoleculeItemInput =
  AddCustomMoleculeToCollectionMutationVariables['input']

export type AddCustomMoleculeToCollectionInput =
  AddCustomMoleculeToCollectionMutationVariables

export type AddChemblMoleculeToCollectionInput =
  AddChemblMoleculeToCollectionMutationVariables

export type MoleculeItemDTO =
  | {
    __typename: 'ChEMBLMoleculeItemDTO';
    id: string;
    label?: string | null;
    notes?: string | null;
    type: string;                           // esposto dal backend
    createdAt: string | number;             // backend @Field(() => String)
    updatedAt: string | number;             // backend @Field(() => String)
    touchedAt: string | number
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
    touchedAt: string | number
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
    createdAt?: string;
    updatedAt?: string;
    touchedAt: string
    chemblDetails?: unknown;
    t1Inference?: T1PredictionDTO
  }
  | {
    id: string;
    label?: string | null;
    notes?: string | null;
    type: 'custom';
    joins: {
      id: string;
      collection: MoleculeCollection
    }[];
    canonicalSmiles: string;
    molFormula?: string | null;
    name?: string | null;
    propertiesJson?: string | null;
    createdAt?: string;
    updatedAt?: string;
    touchedAt: string
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


export type MoleculeCollection =
  PaginatedCollectionsQuery['myMoleculeCollectionsPaginated']['items'][number]

export interface Animatable {
  triggerDisappear: WritableSignal<boolean>
  collapse: WritableSignal<boolean>
}

export type UiMoleculeCollection = MoleculeCollection & Animatable

export interface MoleculeCardItemModel extends Animatable {
  id: string
  type: 'system' | 'chembl' | 'custom'
  name: string
  syn: string
  mwFreebase?: number
  maxPhase?: number
  smiles: string
  createdAt: number
  updatedAt: number
  touchedAt: number
}

export type BindManyCollectionsToMoleculeDTO =
  BindManyCollectionsToMoleculeMutation['bindManyCollectionsToMolecule']

export type DuplicateCollectionRes =
  NonNullable<DuplicateCollectionMutation['duplicateCollection']>
