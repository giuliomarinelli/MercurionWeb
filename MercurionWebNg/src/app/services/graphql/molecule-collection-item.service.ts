import { Injectable, computed, signal } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import {
  MoleculeCollectionItemClient,
  MoleculeCollectionItemEntityShort,
  CreateMoleculeItemInput,
  MoleculeItemDTO,
} from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { CREATE_MOLECULE_ITEM, DELETE_MOLECULE_ITEM, MOLECULE_ITEM, MOLECULE_ITEM_FRAG_SHORT, MY_MOLECULE_ITEMS, UPDATE_MOLECULE_ITEM, UPDATE_MOLECULE_ITEM_LABEL, UPDATE_MOLECULE_ITEM_NOTES, UPDATE_MOLECULE_ITEM_NAME, UPDATE_MOLECULE_ITEM_SMILES } from './graphql-actions/molecule-collection-item';

// ---------- helpers ----------
function extractGqlData<T>(res: any, field: keyof T, allowNull = false): any {
  if (res.errors?.length) {
    throw new Error(`GqlError::${res.errors.map((e: any) => e.message).join(', ')}`);
  }
  if (!res.data || !(field in res.data)) {
    throw new Error('GqlError::NoData');
  }
  const value = res.data[field as any];
  if (value === null && !allowNull) {
    throw new Error('GqlError::NoData');
  }
  return value; // può essere null se allowNull=true
}

function toNum(n: string | number): number {
  return typeof n === 'number' ? n : Number(n);
}

function mapDtoToClient(node: MoleculeItemDTO): MoleculeCollectionItemClient {
  if (node.__typename === 'ChEMBLMoleculeItemDTO') {
    return {
      id: node.id,
      label: node.label ?? null,
      notes: node.notes ?? null,
      type: 'chembl',
      joins: node.joins ?? [],
      chemblMolregno: toNum(node.chemblMolregno),
      createdAt: String(node.createdAt),
      updatedAt: String(node.updatedAt),
      // chemblDetails arriva già con i campi necessari al template
      chemblDetails: node.chemblDetails,
    };
  }
  // Custom
  return {
    id: node.id,
    label: node.label ?? null,
    notes: node.notes ?? null,
    type: 'custom',
    joins: node.joins ?? [],
    canonicalSmiles: node.canonicalSmiles,
    molFormula: node.molFormula ?? null,
    name: node.name ?? null,
    propertiesJson: node.propertiesJson ?? null,
    createdAt: String(node.createdAt),
    updatedAt: String(node.updatedAt),
  };
}

function mapDtoToShort(node: MoleculeItemDTO): MoleculeCollectionItemEntityShort {
  return {
    id: node.id,
    type: node.__typename === 'ChEMBLMoleculeItemDTO' ? 'chembl' : 'custom',
    chemblMolregno:
      node.__typename === 'ChEMBLMoleculeItemDTO' ? toNum(node.chemblMolregno) : undefined,
  };
}



// ---------- Service ----------
@Injectable({ providedIn: 'root' })
export class MoleculeCollectionItemService {
  private _items = signal<MoleculeCollectionItemClient[]>([]);
  private _loading = signal<boolean>(false);

  readonly items = computed(() => this._items());
  readonly loading = computed(() => this._loading());

  constructor(private apollo: Apollo) { }

  // LISTA
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
        tap(items => {
          this._items.set(items);
          this._loading.set(false);
        })
      );
  }

  // GET BY ID (polimorfico, può essere null)
  getItemById(id: string): Observable<MoleculeCollectionItemClient | null> {
    return this.apollo
      .watchQuery<{ moleculeItem: MoleculeItemDTO | null }>({
        query: MOLECULE_ITEM,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        map(res => extractGqlData(res, 'moleculeItem', true) as MoleculeItemDTO | null),
        map(node => (node ? mapDtoToClient(node) : null))
      );
  }

  // GET SHORT BY ID (ridotto, per risolvere molregno dai UUID)
  getItemShortById(id: string): Observable<MoleculeCollectionItemEntityShort | null> {
    return this.apollo
      .watchQuery<{ moleculeItem: MoleculeItemDTO | null }>({
        query: MOLECULE_ITEM_FRAG_SHORT,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        map(res => extractGqlData(res, 'moleculeItem', true) as MoleculeItemDTO | null),
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

  // UPDATE
  updateItem(id: string, input: CreateMoleculeItemInput): Observable<MoleculeCollectionItemClient | null> {
    return this.apollo
      .mutate<{ updateMoleculeItem: MoleculeItemDTO | null }>({
        mutation: UPDATE_MOLECULE_ITEM,
        variables: { id, input },
      })
      .pipe(
        map(res => extractGqlData(res, 'updateMoleculeItem', true) as MoleculeItemDTO | null),
        map(node => (node ? mapDtoToClient(node) : null))
      );
  }

  updateItemLabel(id: string, label: string, type: 'chembl' | 'custom'): Observable<MoleculeCollectionItemClient | null> {
    return this.apollo
      .mutate<{ updateMoleculeItemLabel: MoleculeItemDTO | null }>({
        mutation: UPDATE_MOLECULE_ITEM_LABEL,
        variables: { id, label, type }
      })
      .pipe(
        map(res => extractGqlData(res, 'updateMoleculeItem', true) as MoleculeItemDTO | null),
        map(node => node ? mapDtoToClient(node) : null)
      )
  }

  updateItemNotes(id: string, notes: string, type: 'chembl' | 'custom'): Observable<MoleculeCollectionItemClient | null> {
    return this.apollo
      .mutate<{ updateMoleculeItemNotes: MoleculeItemDTO | null }>({
        mutation: UPDATE_MOLECULE_ITEM_NOTES,
        variables: { id, notes, type }
      })
      .pipe(
        map(res => extractGqlData(res, 'updateMoleculeItem', true) as MoleculeItemDTO | null),
        map(node => node ? mapDtoToClient(node) : null)
      )

  }

  updateItemName(id: string, name: string, type: 'custom'): Observable<MoleculeCollectionItemClient | null> {
    return this.apollo
      .mutate<{ updateMoleculeItemName: MoleculeItemDTO | null }>({
        mutation: UPDATE_MOLECULE_ITEM_NAME,
        variables: { id, name, type }
      })
      .pipe(
        map(res => extractGqlData(res, 'updateMoleculeItem', true) as MoleculeItemDTO | null),
        map(node => node ? mapDtoToClient(node) : null)
      )
  }

  updateItemCanonicalSmiles(id: string, canonicalSmiles: string, type: 'custom', propertiesJson: string): Observable<MoleculeCollectionItemClient | null> {
    return this.apollo
      .mutate<{ updateMoleculeItemName: MoleculeItemDTO | null }>({
        mutation: UPDATE_MOLECULE_ITEM_SMILES,
        variables: { id, canonicalSmiles, type, propertiesJson }
      })
      .pipe(
        map(res => extractGqlData(res, 'updateMoleculeItem', true) as MoleculeItemDTO | null),
        map(node => node ? mapDtoToClient(node) : null)
      )
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

  // Utility: dati essenziali per custom
  getCustomSmilesById(id: string): Observable<{ id: string; canonicalSmiles: string; name: string | null; molFormula: string | null; }> {
    return this.apollo
      .watchQuery<{ moleculeItem: MoleculeItemDTO | null }>({
        query: MOLECULE_ITEM,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        map(res => extractGqlData(res, 'moleculeItem', true) as MoleculeItemDTO | null),
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
