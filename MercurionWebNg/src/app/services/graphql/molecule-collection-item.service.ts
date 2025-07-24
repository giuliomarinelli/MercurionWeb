import { Injectable, computed, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable, tap } from 'rxjs';
import { CreateMoleculeItemInput, MoleculeCollectionItem } from '../../Models/graphql/molecule-collection/molecule-collection.types';

function extractGqlData<T>(res: any, field: keyof T): any {
  if (res.errors && res.errors.length) {
    throw new Error(`GqlError::${res.errors.map((e: any) => e.message).join(', ')}`);
  }
  if (!res.data || !res.data[field]) {
    throw new Error('GqlError::NoData');
  }
  return res.data[field];
}



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

const MY_MOLECULE_ITEMS = gql`
  query MyMoleculeItems {
    myMoleculeItems {
      ${MOLECULE_ITEM_FRAGMENT}
    }
  }
`;

const MOLECULE_ITEM = gql`
  query MoleculeItem($id: ID!) {
    moleculeItem(id: $id) {
      ${MOLECULE_ITEM_FRAGMENT}
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
  private _items = signal<MoleculeCollectionItem[]>([]);
  private _loading = signal<boolean>(false);

  readonly items = computed(() => this._items());
  readonly loading = computed(() => this._loading());

  constructor(private apollo: Apollo) {}

  // LISTA TUTTE LE MOLECOLE
  getAllItems(): Observable<MoleculeCollectionItem[]> {
    this._loading.set(true);
    return this.apollo
      .watchQuery<{ myMoleculeItems: MoleculeCollectionItem[] }>({
        query: MY_MOLECULE_ITEMS,
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        map(res => extractGqlData(res, 'myMoleculeItems')),
        tap(items => {
          this._items.set(items);
          this._loading.set(false);
        })
      );
  }

  // GET BY ID
  getItemById(id: string): Observable<MoleculeCollectionItem | null> {
    return this.apollo
      .watchQuery<{ moleculeItem: MoleculeCollectionItem | null }>({
        query: MOLECULE_ITEM,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(map(res => extractGqlData(res, 'moleculeItem')));
  }

  // CREATE
  createItem(input: CreateMoleculeItemInput): Observable<MoleculeCollectionItem> {
    return this.apollo
      .mutate<{ createMoleculeItem: MoleculeCollectionItem }>({
        mutation: CREATE_MOLECULE_ITEM,
        variables: { input },
      })
      .pipe(map(res => extractGqlData(res, 'createMoleculeItem')));
  }

  // UPDATE
  updateItem(id: string, input: CreateMoleculeItemInput): Observable<MoleculeCollectionItem | null> {
    return this.apollo
      .mutate<{ updateMoleculeItem: MoleculeCollectionItem | null }>({
        mutation: UPDATE_MOLECULE_ITEM,
        variables: { id, input },
      })
      .pipe(map(res => extractGqlData(res, 'updateMoleculeItem')));
  }

  // DELETE
  deleteItem(id: string): Observable<boolean> {
    return this.apollo
      .mutate<{ deleteMoleculeItem: boolean }>({
        mutation: DELETE_MOLECULE_ITEM,
        variables: { id },
      })
      .pipe(map(res => extractGqlData(res, 'deleteMoleculeItem')));
  }
}
