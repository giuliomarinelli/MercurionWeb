import { MoleculeCollectionItemClient, MoleculeCollectionItemEntityShort } from './../../Models/graphql/molecule-collection/molecule-collection.types';
import { Injectable, computed, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable, tap } from 'rxjs';
import { CreateMoleculeItemInput, MoleculeItemDTO } from '../../Models/graphql/molecule-collection/molecule-collection.types';

function extractGqlData<T>(res: any, field: keyof T): any {
  if (res.errors && res.errors.length) {
    throw new Error(`GqlError::${res.errors.map((e: any) => e.message).join(', ')}`);
  }
  if (!res.data || !res.data[field]) {
    throw new Error('GqlError::NoData');
  }
  return res.data[field];
}

function mapDtoToClient(node: MoleculeItemDTO): MoleculeCollectionItemClient {
  if (node.__typename === 'ChEMBLMoleculeItemDTO') {
    return {
      id: node.id,
      label: node.label ?? null,
      notes: node.notes ?? null,
      type: 'chembl',
      joins: node.joins,
      chemblMolregno: node.chemblMolregno,
    };
  }
  return {
    id: node.id,
    label: node.label ?? null,
    notes: node.notes ?? null,
    type: 'custom',
    joins: node.joins,
    canonicalSmiles: node.canonicalSmiles,
    molFormula: node.molFormula ?? null,
    name: node.name ?? null,
    propertiesJson: node.propertiesJson ?? null,
  };
}

function mapDtoToShort(node: MoleculeItemDTO): MoleculeCollectionItemEntityShort {
  return {
    id: node.id,
    type: node.__typename === 'ChEMBLMoleculeItemDTO' ? 'chembl' : 'custom',
    chemblMolregno:
      node.__typename === 'ChEMBLMoleculeItemDTO' ? node.chemblMolregno : undefined,
  };
}

const MOLECULE_ITEM = gql`
  query MoleculeItem($id: ID!) {
    moleculeItem(id: $id) {
      __typename
      ... on ChEMBLMoleculeItemDTO {
        id
        label
        notes
        joins { id collection { id name } }
        chemblMolregno
      }
      ... on CustomMoleculeItemDTO {
        id
        label
        notes
        joins { id collection { id name } }
        canonicalSmiles
        molFormula
        name
        propertiesJson
      }
    }
  }
`;

const MOLECULE_ITEM_FRAG_SHORT = gql`
  query MoleculeItemShort($id: ID!) {
    moleculeItem(id: $id) {
      __typename
      ... on ChEMBLMoleculeItemDTO {
        id
        chemblMolregno
      }
      ... on CustomMoleculeItemDTO {
        id
      }
    }
  }
`;

const MY_MOLECULE_ITEMS = gql`
  query MyMoleculeItems {
    myMoleculeItems {
      __typename
      ... on ChEMBLMoleculeItemDTO {
        id
        label
        notes
        joins { id collection { id name } }
        chemblMolregno
      }
      ... on CustomMoleculeItemDTO {
        id
        label
        notes
        joins { id collection { id name } }
        canonicalSmiles
        molFormula
        name
        propertiesJson
      }
    }
  }
`;


// --- GQL DEFINITIONS ---
const MOLECULE_ITEM_FRAGMENT = `
  id
  label
  notes
  type
  joins { id collection { id name } }
  ... on ChEMBLMoleculeItemEntity { chemblMolregno }
  ... on CustomMoleculeItemEntity { canonicalSmiles molFormula name propertiesJson }
`;

const MOLECULE_ITEM_SHORT = `
  id
  type
  ... on ChEMBLMoleculeItemEntity { chemblMolregno }
`;

const CUSTOM_MOLECULE_SMILES = gql`
  query CustomMoleculeSmiles($id: ID!) {
    customMoleculeItem(id: $id) {
      id
      canonicalSmiles
      name
      molFormula
    }
  }
`;



const CREATE_MOLECULE_ITEM = gql`
  mutation CreateMoleculeItem($input: CreateMoleculeItemInput!) {
    createMoleculeItem(input: $input) {
      ${MOLECULE_ITEM_FRAGMENT}
    }
  }
`;

const UPDATE_MOLECULE_ITEM = gql`
  mutation UpdateMoleculeItem($id: ID!, $input: CreateMoleculeItemInput!) {
    updateMoleculeItem(id: $id, input: $input) {
      ${MOLECULE_ITEM_FRAGMENT}
    }
  }
`;

const DELETE_MOLECULE_ITEM = gql`
  mutation DeleteMoleculeItem($id: ID!) {
    deleteMoleculeItem(id: $id)
  }
`;

@Injectable({ providedIn: 'root' })
export class MoleculeCollectionItemService {
  private _items = signal<MoleculeCollectionItemClient[]>([]);
  private _loading = signal<boolean>(false);

  readonly items = computed(() => this._items());
  readonly loading = computed(() => this._loading());

  constructor(private apollo: Apollo) { }

  // LISTA TUTTE LE MOLECOLE
  getAllItems(): Observable<MoleculeCollectionItemClient[]> {
    this._loading.set(true);
    return this.apollo
      .watchQuery<{ myMoleculeItems: MoleculeItemDTO[] }>({
        query: MY_MOLECULE_ITEMS,
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        map(res => extractGqlData(res, 'myMoleculeItems') as MoleculeItemDTO[]),
        map(items => items.map(mapDtoToClient)),
        tap(items => { this._items.set(items); this._loading.set(false); })
      );
  }

  getItemById(id: string): Observable<MoleculeCollectionItemClient | null> {
    return this.apollo
      .watchQuery<{ moleculeItem: MoleculeItemDTO | null }>({
        query: MOLECULE_ITEM,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        map(res => extractGqlData(res, 'moleculeItem') as MoleculeItemDTO | null),
        map(node => (node ? mapDtoToClient(node) : null))
      );
  }

  getItemShortById(id: string): Observable<MoleculeCollectionItemEntityShort | null> {
    return this.apollo
      .watchQuery<{ moleculeItem: MoleculeItemDTO | null }>({
        query: MOLECULE_ITEM_FRAG_SHORT,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        map(res => extractGqlData(res, 'moleculeItem') as MoleculeItemDTO | null),
        map(node => (node ? mapDtoToShort(node) : null))
      );
  }


  // CREATE
  createItem(input: CreateMoleculeItemInput): Observable<MoleculeCollectionItemClient> {
    return this.apollo
      .mutate<{ createMoleculeItem: MoleculeItemDTO }>({
        mutation: CREATE_MOLECULE_ITEM,
        variables: { input },
      })
      .pipe(
        map(res => extractGqlData(res, 'createMoleculeItem') as MoleculeItemDTO),
        map(mapDtoToClient)
      );
  }

  updateItem(id: string, input: CreateMoleculeItemInput): Observable<MoleculeCollectionItemClient | null> {
    return this.apollo
      .mutate<{ updateMoleculeItem: MoleculeItemDTO | null }>({
        mutation: UPDATE_MOLECULE_ITEM,
        variables: { id, input },
      })
      .pipe(
        map(res => extractGqlData(res, 'updateMoleculeItem') as MoleculeItemDTO | null),
        map(node => (node ? mapDtoToClient(node) : null))
      );
  }

  deleteItem(id: string): Observable<boolean> {
    return this.apollo
      .mutate<{ deleteMoleculeItem: boolean }>({
        mutation: DELETE_MOLECULE_ITEM,
        variables: { id },
      })
      .pipe(map(res => extractGqlData(res, 'deleteMoleculeItem')));
  }

  getCustomSmilesById(id: string) {
    return this.apollo
      .watchQuery<{ moleculeItem: MoleculeItemDTO | null }>({
        query: MOLECULE_ITEM,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        map(res => extractGqlData(res, 'moleculeItem') as MoleculeItemDTO | null),
        map(node => {
          if (!node) throw new Error('Item not found');
          if (node.__typename !== 'CustomMoleculeItemDTO') throw new Error('Not a custom molecule');
          return {
            id: node.id,
            canonicalSmiles: node.canonicalSmiles,
            name: node.name ?? null,
            molFormula: node.molFormula ?? null,
          };
        })
      );
  }
}



