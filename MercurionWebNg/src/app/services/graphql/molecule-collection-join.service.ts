import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable } from 'rxjs';

// --- TYPES ---
export interface MoleculeProperties {
  mwFreebase: number | string;
  alogp: number | string;
  hba: number;
  hbd: number;
  psa: number | string;
  rtb: number;
}

// Helper: parsing string JSON -> MoleculeProperties
export function parseMoleculeProperties(json?: string | null): MoleculeProperties | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as MoleculeProperties;
  } catch {
    return null;
  }
}

export interface CustomMoleculeItemInput {
  canonicalSmiles: string;
  label?: string;
  notes?: string;
  molFormula?: string;
  name?: string;
  propertiesJson?: string; // da serializzare via JSON.stringify(properties)
}

export interface CustomMoleculeItemEntity {
  id: string;
  type: 'custom';
  label?: string | null;
  notes?: string | null;
  canonicalSmiles: string;
  molFormula?: string | null;
  name?: string | null;
  propertiesJson?: string | null;
  joins: { id: string; collection: { id: string; name: string } }[];
  // Getter derivato (non in DB, aggiunto in UI):
  properties?: MoleculeProperties | null;
}

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

// --- GQL OPERATIONS ---
const ADD_CHEMBL_TO_COLLECTION = gql`
  mutation AddChemblMoleculeToCollection(
    $collectionId: ID!,
    $chemblMolregno: Float!,
    $label: String,
    $notes: String
  ) {
    addChemblMoleculeToCollection(
      collectionId: $collectionId,
      chemblMolregno: $chemblMolregno,
      label: $label,
      notes: $notes
    ) {
      id
      chemblMolregno
      type
      label
      notes
      joins { id collection { id name } }
    }
  }
`;

const ADD_CUSTOM_TO_COLLECTION = gql`
  mutation AddCustomMoleculeToCollection(
    $collectionId: ID!,
    $input: CustomMoleculeItemInput!
  ) {
    addCustomMoleculeToCollection(collectionId: $collectionId, input: $input) {
      id
      type
      label
      notes
      canonicalSmiles
      name
      propertiesJson
      molFormula
      joins { id collection { id name } }
    }
  }
`;

const REMOVE_CHEMBL_FROM_COLLECTION = gql`
  mutation RemoveChemblMoleculeFromCollection($collectionId: ID!, $itemId: ID!) {
    removeChemblMoleculeFromCollection(collectionId: $collectionId, itemId: $itemId)
  }
`;

const REMOVE_CUSTOM_FROM_COLLECTION = gql`
  mutation RemoveCustomMoleculeFromCollection($collectionId: ID!, $itemId: ID!) {
    removeCustomMoleculeFromCollection(collectionId: $collectionId, itemId: $itemId)
  }
`;

// --- EXTRACT GQL DATA ---
function extractGqlData<T>(res: any, field: keyof T): any {
  if (res.errors && res.errors.length) throw new Error(`GqlError::${res.errors.map((e: any) => e.message).join(', ')}`);
  if (!res.data || !res.data[field]) throw new Error('GqlError::NoData');
  return res.data[field];
}

// --- MoleculeJoinService ---
@Injectable({ providedIn: 'root' })
export class MoleculeJoinService {
  constructor(private apollo: Apollo) { }

  // Aggiungi Chembl
  addChemblMoleculeToCollection(params: AddChemblMoleculeToCollectionInput): Observable<any> {
    return this.apollo
      .mutate({
        mutation: ADD_CHEMBL_TO_COLLECTION,
        variables: params,
      })
      .pipe(map(res => extractGqlData(res, 'addChemblMoleculeToCollection')));
  }

  // Aggiungi Custom (ritorna già il campo properties parsato)
  addCustomMoleculeToCollection(params: AddCustomMoleculeToCollectionInput): Observable<CustomMoleculeItemEntity> {
    return this.apollo
      .mutate<{ addCustomMoleculeToCollection: CustomMoleculeItemEntity }>({
        mutation: ADD_CUSTOM_TO_COLLECTION,
        variables: params,
      })
      .pipe(
        map(res => extractGqlData(res, 'addCustomMoleculeToCollection')),
        map(entity => ({
          ...entity,
          properties: parseMoleculeProperties(entity.propertiesJson)
        }))
      );
  }

  // Rimuovi Chembl
  removeChemblMoleculeFromCollection(collectionId: string, itemId: string): Observable<boolean> {
    return this.apollo
      .mutate({
        mutation: REMOVE_CHEMBL_FROM_COLLECTION,
        variables: { collectionId, itemId },
      })
      .pipe(map(res => extractGqlData(res, 'removeChemblMoleculeFromCollection')));
  }

  // Rimuovi Custom
  removeCustomMoleculeFromCollection(collectionId: string, itemId: string): Observable<boolean> {
    return this.apollo
      .mutate({
        mutation: REMOVE_CUSTOM_FROM_COLLECTION,
        variables: { collectionId, itemId },
      })
      .pipe(map(res => extractGqlData(res, 'removeCustomMoleculeFromCollection')));
  }
}
