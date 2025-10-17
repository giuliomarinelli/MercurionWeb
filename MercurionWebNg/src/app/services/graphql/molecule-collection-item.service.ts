import { NormalizedMoleculeCollectionBasicData } from './../../Models/graphql/molecule.detail.models';
import { PageModel } from './../../Models/graphql/page.model';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import {
  MoleculeCollectionItemClient,
  MoleculeCollectionItemEntityShort,
  CreateMoleculeItemInput,
  MoleculeItemDTO,
} from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { CREATE_MOLECULE_ITEM, DELETE_MOLECULE_ITEM, MOLECULE_ITEM, MOLECULE_ITEM_FRAG_SHORT, MY_MOLECULE_ITEMS, UPDATE_MOLECULE_ITEM, UPDATE_MOLECULE_ITEM_LABEL, UPDATE_MOLECULE_ITEM_NOTES, UPDATE_MOLECULE_ITEM_NAME, UPDATE_MOLECULE_ITEM_SMILES, PAGINATED_MOLECULE_ITEMS_FOR_CARD_BY_COLLECTION, MARK_MOLECULE_COLLECTION_ITEM_AS_TOUCHED, HAS_USER_CHEMBL_MOLECULE_BY_MOLREGNO_THEN_GET_UUID, EXISTS_CHEMBL_MOLECULE_BY_UUID_THEN_GET_MOLREGNO, ALL_PAGINATED_MOLECULE_ITEMS_FOR_CARD, ALL_BASIC_DATA } from './graphql-actions/molecule-collection-item.gql-actions';
import { extractGqlData } from './graphql-helpers/extract-gql-data.gql-helper';
import { TypeGuardsService } from '../../type-guards.service';


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
      touchedAt: String(node.touchedAt),
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
    touchedAt: String(node.touchedAt)
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

  // ======================= DEPS =======================
  private readonly apollo = inject(Apollo)
  private readonly typeGuards = inject(TypeGuardsService)
  // ====================================================



  private _items = signal<MoleculeCollectionItemClient[]>([]);
  private _loading = signal<boolean>(false);

  readonly items = computed(() => this._items());
  readonly loading = computed(() => this._loading());


  private normalizeClientItem(item: MoleculeCollectionItemClient): NormalizedMoleculeCollectionBasicData {
    let name = ''
    let canonicalSmiles = ''
    if (this.typeGuards.isChemblMolecule(item)) {
      name = item.chemblDetails.preferredName
      canonicalSmiles = item.chemblDetails.canonicalSmiles
    } else if (this.typeGuards.isCustomMolecule(item)) {
      name = item.name ?? 'Lead sconosciuto'
      canonicalSmiles = item.canonicalSmiles
    }
    return {
      id: item.id,
      name,
      canonicalSmiles,
      type: item.type
    }
  }

  getAllNormalizedBasicData(): Observable<NormalizedMoleculeCollectionBasicData[]> {
    return this.apollo
      .watchQuery<{ myMoleculeItems: MoleculeItemDTO[] }>({
        query: ALL_BASIC_DATA,
        fetchPolicy: 'network-only'
      }).valueChanges.pipe(
        map(res => extractGqlData(res, 'myMoleculeItems') as MoleculeItemDTO[]),
        map(items => items.map(mapDtoToClient)),
        map(items => items.map(this.normalizeClientItem))
      )
  }

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

  getPaginatedItemsForCollection(collectionId: string, page: number = 1, limit: number = 20): Observable<PageModel<MoleculeCollectionItemClient>> {
    return this.apollo
      .watchQuery<{ paginatedMoleculeCollectionItemsByCollection: PageModel<MoleculeItemDTO> }>({
        query: PAGINATED_MOLECULE_ITEMS_FOR_CARD_BY_COLLECTION,
        variables: {
          collectionId,
          page,
          limit
        },
        fetchPolicy: 'network-only'
      })
      .valueChanges.pipe(
        map(res => extractGqlData(res, 'paginatedMoleculeCollectionItemsByCollection', true) as PageModel<MoleculeItemDTO>),
        map(node => {
          const mappedItems = node.items.map(i => mapDtoToClient(i))
          const newNode = {
            ...node,
            items: mappedItems
          }
          return newNode
        })
      )
  }

  getAllPaginatedItems(page = 1, limit = 20): Observable<PageModel<MoleculeCollectionItemClient>> {
    return this.apollo
      .watchQuery<{ paginatedMoleculeCollectionItemsByUser: PageModel<MoleculeItemDTO> }>({
        query: ALL_PAGINATED_MOLECULE_ITEMS_FOR_CARD,
        variables: { page, limit },
        fetchPolicy: 'network-only'
      }).valueChanges.pipe(
        map(res => extractGqlData(res, 'paginatedMoleculeCollectionItemsByUser', true) as PageModel<MoleculeItemDTO>),
        map(node => {
          const mappedItems = node.items.map(i => mapDtoToClient(i))
          const newNode = {
            ...node,
            items: mappedItems
          }
          return newNode
        })
      )
  }

  hasUserChEMBLMoleculeByMolregnoThenGetUUID(molregno: number): Observable<string | null> {
    return this.apollo
      .watchQuery<{ hasUserChEMBLMoleculeByMolregnoThenGetUUID: string | null }>({
        query: HAS_USER_CHEMBL_MOLECULE_BY_MOLREGNO_THEN_GET_UUID,
        variables: { molregno },
        fetchPolicy: 'network-only'
      }).valueChanges.pipe(
        map(res => extractGqlData(res, 'hasUserChEMBLMoleculeByMolregnoThenGetUUID', true))
      )
  }

  existsChEMBLMoleculeByUUIDThenGetMolregno(_uuid_: string): Observable<string | null> {
    return this.apollo
      .watchQuery<{ existsChEMBLMoleculeByUUIDThenGetMolregno: string | null }>({
        query: EXISTS_CHEMBL_MOLECULE_BY_UUID_THEN_GET_MOLREGNO,
        variables: { _uuid_ },
        fetchPolicy: 'network-only'
      }).valueChanges.pipe(
        map(res => extractGqlData(res, 'existsChEMBLMoleculeByUUIDThenGetMolregno', true))
      )
  }

  // ====================================================================================================================

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

  markItemAsTouched(id: string, flagIds: string): Observable<boolean> {
    return this.apollo
      .mutate<{ markMoleculeCollectionItemAsTouched: boolean }>({
        mutation: MARK_MOLECULE_COLLECTION_ITEM_AS_TOUCHED,
        variables: { id, flagIds }
      }).pipe(
        map(res => extractGqlData(res, 'markMoleculeCollectionItemAsTouched'))
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
