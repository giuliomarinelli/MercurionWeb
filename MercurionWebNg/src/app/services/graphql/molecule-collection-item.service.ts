import { MoleculeSearchResult } from './../../Models/graphql/molecule-search/molecule-search-result.interface';
import { NormalizedMoleculeCollectionBasicData } from './../../Models/graphql/molecule.detail.models';
import { PageModel } from '../../Models/graphql/page.models';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import {
  MoleculeCollectionItemClient,
  MoleculeCollectionItemEntityShort,
  CreateMoleculeItemInput,
  MoleculeItemLookup
} from '../../Models/graphql/molecule-collection/molecule-collection.types';
import {
  extractGqlData,
  GqlDataError
} from './graphql-helpers/v1/extract-gql-data.helper';
import { MoleculeSearchInput } from '../../Models/graphql/molecule-search/molecule-search-input.interface';
import { AddManyChEMBLItemDTO } from '../../Models/graphql/add-many-chembl-item.dto';
import {
  mapCustomMoleculeLookup,
  mapMoleculeItemBasicData,
  mapMoleculeItemDtoToClient,
  mapMoleculeItemShort
} from './molecule-collection-item.mapper';
import {
  AddManyChemblItemsToCollectionDocument,
  AddManyChemblItemsToCollectionMutation,
  AddManyChemblItemsToCollectionMutationVariables,
  AddManyMoleculesToCollectionDocument,
  AddManyMoleculesToCollectionMutation,
  AddManyMoleculesToCollectionMutationVariables,
  CreateMoleculeItemDocument,
  CreateMoleculeItemMutation,
  CreateMoleculeItemMutationVariables,
  DeleteMoleculeItemDocument,
  DeleteMoleculeItemMutation,
  DeleteMoleculeItemMutationVariables,
  ExistsChEmblMoleculeByUuidThenGetMolregnoDocument,
  ExistsChEmblMoleculeByUuidThenGetMolregnoQuery,
  ExistsChEmblMoleculeByUuidThenGetMolregnoQueryVariables,
  FindOneCustomMoleculeByCanonicalSmilesDocument,
  FindOneCustomMoleculeByCanonicalSmilesQuery,
  FindOneCustomMoleculeByCanonicalSmilesQueryVariables,
  HasUserChEmblMoleculeByMolregnoThenGetUuidDocument,
  HasUserChEmblMoleculeByMolregnoThenGetUuidQuery,
  HasUserChEmblMoleculeByMolregnoThenGetUuidQueryVariables,
  MarkMoleculeCollectionItemAsTouchedDocument,
  MarkMoleculeCollectionItemAsTouchedMutation,
  MarkMoleculeCollectionItemAsTouchedMutationVariables,
  MoleculeItemBasicDataDocument,
  MoleculeItemBasicDataQuery,
  MoleculeItemBasicDataQueryVariables,
  MoleculeItemDocument,
  MoleculeItemQuery,
  MoleculeItemQueryVariables,
  MoleculeItemShortDocument,
  MoleculeItemShortQuery,
  MoleculeItemShortQueryVariables,
  MoleculeSearch_ExcludeAlreadyAddedDocument,
  MoleculeSearch_ExcludeAlreadyAddedQuery,
  MoleculeSearch_ExcludeAlreadyAddedQueryVariables,
  MyMoleculeItemsDocument,
  MyMoleculeItemsQuery,
  MyMoleculeItemsQueryVariables,
  PaginatedMoleculeCollectionItemsByCollectionDocument,
  PaginatedMoleculeCollectionItemsByCollectionQuery,
  PaginatedMoleculeCollectionItemsByCollectionQueryVariables,
  PaginatedMoleculeCollectionItemsByUserDocument,
  PaginatedMoleculeCollectionItemsByUserQuery,
  PaginatedMoleculeCollectionItemsByUserQueryVariables,
  RemoveMoleculeFromCollectionDocument,
  RemoveMoleculeFromCollectionMutation,
  RemoveMoleculeFromCollectionMutationVariables,
  UpdateMoleculeItemCanonicalSmilesDocument,
  UpdateMoleculeItemCanonicalSmilesMutation,
  UpdateMoleculeItemCanonicalSmilesMutationVariables,
  UpdateMoleculeItemDocument,
  UpdateMoleculeItemLabelDocument,
  UpdateMoleculeItemLabelMutation,
  UpdateMoleculeItemLabelMutationVariables,
  UpdateMoleculeItemMutation,
  UpdateMoleculeItemMutationVariables,
  UpdateMoleculeItemNameDocument,
  UpdateMoleculeItemNameMutation,
  UpdateMoleculeItemNameMutationVariables,
  UpdateMoleculeItemNotesDocument,
  UpdateMoleculeItemNotesMutation,
  UpdateMoleculeItemNotesMutationVariables
} from '../../generated/graphql';






// ---------- Service ----------
@Injectable({ providedIn: 'root' })
export class MoleculeCollectionItemService {

  // ======================= DEPS =======================
  private readonly apollo = inject(Apollo)
  // ====================================================



  private _items = signal<MoleculeCollectionItemClient[]>([]);
  private _loading = signal<boolean>(false);

  readonly items = computed(() => this._items());
  readonly loading = computed(() => this._loading());


  getAllNormalizedBasicData(): Observable<NormalizedMoleculeCollectionBasicData[]> {
    return this.apollo
      .query<MoleculeItemBasicDataQuery, MoleculeItemBasicDataQueryVariables>({
        query: MoleculeItemBasicDataDocument,
        fetchPolicy: 'no-cache'
      }).pipe(
        map(res => extractGqlData<MoleculeItemBasicDataQuery, 'myMoleculeItems'>(res, 'myMoleculeItems')),
        map(items => items.map(mapMoleculeItemBasicData))
      )
  }

  // LISTA
  getAllItems(): Observable<MoleculeCollectionItemClient[]> {
    this._loading.set(true);
    return this.apollo
      .query<MyMoleculeItemsQuery, MyMoleculeItemsQueryVariables>({
        query: MyMoleculeItemsDocument,
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map(res => extractGqlData<MyMoleculeItemsQuery, 'myMoleculeItems'>(res, 'myMoleculeItems')),
        map(items => items.map(mapMoleculeItemDtoToClient)),
        tap(items => {
          this._items.set(items);
          this._loading.set(false);
        })
      );
  }


  // GET BY ID (polimorfico, può essere null)
  getItemById(id: string): Observable<MoleculeCollectionItemClient | null> {
    return this.apollo
      .query<MoleculeItemQuery, MoleculeItemQueryVariables>({
        query: MoleculeItemDocument,
        variables: { id },
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map(res => extractGqlData<MoleculeItemQuery, 'moleculeItem'>(res, 'moleculeItem', true)),
        map(node => (node ? mapMoleculeItemDtoToClient(node) : null))
      );
  }

  // GET SHORT BY ID (ridotto, per risolvere molregno dai UUID)
  getItemShortById(id: string): Observable<MoleculeCollectionItemEntityShort | null> {
    return this.apollo
      .query<MoleculeItemShortQuery, MoleculeItemShortQueryVariables>({
        query: MoleculeItemShortDocument,
        variables: { id },
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map(res => extractGqlData<MoleculeItemShortQuery, 'moleculeItem'>(res, 'moleculeItem', true)),
        map(node => (node ? mapMoleculeItemShort(node) : null))
      );
  }

  getPaginatedItemsForCollection(collectionId: string, page: number = 1, limit: number = 20, q: string): Observable<PageModel<MoleculeCollectionItemClient>> {
    return this.apollo
      .query<PaginatedMoleculeCollectionItemsByCollectionQuery, PaginatedMoleculeCollectionItemsByCollectionQueryVariables>({
        query: PaginatedMoleculeCollectionItemsByCollectionDocument,
        variables: {
          collectionId,
          page,
          limit,
          q
        },
        fetchPolicy: 'no-cache'
      })
      .pipe(
        map(res => extractGqlData<PaginatedMoleculeCollectionItemsByCollectionQuery, 'paginatedMoleculeCollectionItemsByCollection'>(res, 'paginatedMoleculeCollectionItemsByCollection')),
        map(node => {
          const mappedItems = node.items.map(i => mapMoleculeItemDtoToClient(i))
          const newNode = {
            ...node,
            items: mappedItems
          }
          return newNode
        })
      )
  }

  getAllPaginatedItems(page = 1, limit = 20, q: string, excludeJoinedToCollection: boolean | null = null, collectionId: string | null = null): Observable<PageModel<MoleculeCollectionItemClient>> {
    return this.apollo
      .query<PaginatedMoleculeCollectionItemsByUserQuery, PaginatedMoleculeCollectionItemsByUserQueryVariables>({
        query: PaginatedMoleculeCollectionItemsByUserDocument,
        variables: { page, limit, q, excludeJoinedToCollection, collectionId },
        fetchPolicy: 'no-cache'
      }).pipe(
        map(res => extractGqlData<PaginatedMoleculeCollectionItemsByUserQuery, 'paginatedMoleculeCollectionItemsByUser'>(res, 'paginatedMoleculeCollectionItemsByUser')),
        map(node => {
          const mappedItems = node.items.map(i => mapMoleculeItemDtoToClient(i))
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
      .query<HasUserChEmblMoleculeByMolregnoThenGetUuidQuery, HasUserChEmblMoleculeByMolregnoThenGetUuidQueryVariables>({
        query: HasUserChEmblMoleculeByMolregnoThenGetUuidDocument,
        variables: { molregno },
        fetchPolicy: 'no-cache'
      }).pipe(
        map(res => extractGqlData<HasUserChEmblMoleculeByMolregnoThenGetUuidQuery, 'hasUserChEMBLMoleculeByMolregnoThenGetUUID'>(res, 'hasUserChEMBLMoleculeByMolregnoThenGetUUID', true))
      )
  }

  existsChEMBLMoleculeByUUIDThenGetMolregno(_uuid_: string): Observable<string | null> {
    return this.apollo
      .query<ExistsChEmblMoleculeByUuidThenGetMolregnoQuery, ExistsChEmblMoleculeByUuidThenGetMolregnoQueryVariables>({
        query: ExistsChEmblMoleculeByUuidThenGetMolregnoDocument,
        variables: { _uuid_ },
        fetchPolicy: 'no-cache'
      }).pipe(
        map(res => extractGqlData<ExistsChEmblMoleculeByUuidThenGetMolregnoQuery, 'existsChEMBLMoleculeByUUIDThenGetMolregno'>(res, 'existsChEMBLMoleculeByUUIDThenGetMolregno', true))
      )
  }

  searchChemblMolecules_excludeAlreadyAdded(query: string, collectionId: string, limit = 100): Observable<MoleculeSearchResult[]> {
    const input: MoleculeSearchInput = {
      query,
      limit
    }
    return this.apollo
      .query<MoleculeSearch_ExcludeAlreadyAddedQuery, MoleculeSearch_ExcludeAlreadyAddedQueryVariables>({
        query: MoleculeSearch_ExcludeAlreadyAddedDocument,
        variables: { input, collectionId },
        fetchPolicy: 'no-cache'
      }).pipe(
        map(res => extractGqlData<MoleculeSearch_ExcludeAlreadyAddedQuery, 'moleculeSearch_excludeAlreadyAdded'>(res, 'moleculeSearch_excludeAlreadyAdded'))
      )
  }

  findOneCustomMoleculeByCanonicalSmiles_shortFetch(canonicalSmiles: string): Observable<MoleculeItemLookup | null> {
    return this.apollo
      .query<FindOneCustomMoleculeByCanonicalSmilesQuery, FindOneCustomMoleculeByCanonicalSmilesQueryVariables>({
        query: FindOneCustomMoleculeByCanonicalSmilesDocument,
        variables: {
          canonicalSmiles
        },
        fetchPolicy: 'no-cache'
      }).pipe(
        map(res => extractGqlData<
          FindOneCustomMoleculeByCanonicalSmilesQuery,
          'findOneCustomMoleculeByCanonicalSmiles'
        >(res, 'findOneCustomMoleculeByCanonicalSmiles', true)),
        map(node => node ? mapCustomMoleculeLookup(node) : null),
        catchError((e) => {
          if (e instanceof GqlDataError && e.kind === 'NoData') {
            return of(null)
          }
          return throwError(() => e)
        })
      )
  }



  addManyChEMBLItemsToCollection(collectionId: string, input: AddManyChEMBLItemDTO[]): Observable<boolean> {
    return this.apollo
      .mutate<AddManyChemblItemsToCollectionMutation, AddManyChemblItemsToCollectionMutationVariables>({
        mutation: AddManyChemblItemsToCollectionDocument,
        variables: {
          collectionId,
          // Preserve the existing numeric ID payload accepted by the server.
          // The generated ID input mapping is string-only until the client DTO
          // is normalized in a separate contract migration.
          input: input as unknown as AddManyChemblItemsToCollectionMutationVariables['input']
        }
      }).pipe(
        map(res => extractGqlData<AddManyChemblItemsToCollectionMutation, 'addManyChemblItemsToCollection'>(res, 'addManyChemblItemsToCollection'))
      )
  }

  addManyMoleculesToCollection(collectionId: string, itemIds: string[], selectAll: boolean): Observable<boolean> {
    return this.apollo
      .mutate<AddManyMoleculesToCollectionMutation, AddManyMoleculesToCollectionMutationVariables>({
        mutation: AddManyMoleculesToCollectionDocument,
        variables: {
          collectionId,
          itemIds,
          selectAll
        }
      }).pipe(
        map(res => extractGqlData<AddManyMoleculesToCollectionMutation, 'addManyMoleculesToCollection'>(res, 'addManyMoleculesToCollection'))
      )
  }

  removeMoleculeFromCollection(collectionId: string, itemId: string, deleteCollectionIfEmpty = false): Observable<boolean> {
    return this.apollo
      .mutate<RemoveMoleculeFromCollectionMutation, RemoveMoleculeFromCollectionMutationVariables>({
        mutation: RemoveMoleculeFromCollectionDocument,
        variables: {
          collectionId,
          itemId,
          deleteCollectionIfEmpty
        }
      }).pipe(
        map(res => extractGqlData<RemoveMoleculeFromCollectionMutation, 'removeMoleculeFromCollection'>(res, 'removeMoleculeFromCollection'))
      )
  }

  // ====================================================================================================================

  // CREATE
  createItem(input: CreateMoleculeItemInput): Observable<MoleculeCollectionItemClient> {
    return this.apollo
      .mutate<CreateMoleculeItemMutation, CreateMoleculeItemMutationVariables>({
        mutation: CreateMoleculeItemDocument,
        variables: { input },
      })
      .pipe(
        map(res => extractGqlData<CreateMoleculeItemMutation, 'createMoleculeItem'>(res, 'createMoleculeItem')),
        map(mapMoleculeItemDtoToClient)
      );
  }

  // UPDATE
  updateItem(id: string, input: CreateMoleculeItemInput): Observable<MoleculeCollectionItemClient | null> {
    return this.apollo
      .mutate<UpdateMoleculeItemMutation, UpdateMoleculeItemMutationVariables>({
        mutation: UpdateMoleculeItemDocument,
        variables: { id, input },
      })
      .pipe(
        map(res => extractGqlData<UpdateMoleculeItemMutation, 'updateMoleculeItem'>(res, 'updateMoleculeItem', true)),
        map(node => (node ? mapMoleculeItemDtoToClient(node) : null))
      );
  }

  updateItemLabel(id: string, label: string, type: 'chembl' | 'custom'): Observable<MoleculeCollectionItemClient | null> {
    return this.apollo
      .mutate<UpdateMoleculeItemLabelMutation, UpdateMoleculeItemLabelMutationVariables>({
        mutation: UpdateMoleculeItemLabelDocument,
        variables: { id, label, type }
      })
      .pipe(
        map(res => extractGqlData<UpdateMoleculeItemLabelMutation, 'updateMoleculeItem'>(res, 'updateMoleculeItem', true)),
        map(node => node ? mapMoleculeItemDtoToClient(node) : null)
      )
  }

  updateItemNotes(id: string, notes: string, type: 'chembl' | 'custom'): Observable<MoleculeCollectionItemClient | null> {
    return this.apollo
      .mutate<UpdateMoleculeItemNotesMutation, UpdateMoleculeItemNotesMutationVariables>({
        mutation: UpdateMoleculeItemNotesDocument,
        variables: { id, notes, type }
      })
      .pipe(
        map(res => extractGqlData<UpdateMoleculeItemNotesMutation, 'updateMoleculeItem'>(res, 'updateMoleculeItem', true)),
        map(node => node ? mapMoleculeItemDtoToClient(node) : null)
      )

  }

  updateItemName(id: string, name: string, type: 'custom'): Observable<MoleculeCollectionItemClient | null> {
    return this.apollo
      .mutate<UpdateMoleculeItemNameMutation, UpdateMoleculeItemNameMutationVariables>({
        mutation: UpdateMoleculeItemNameDocument,
        variables: { id, name, type }
      })
      .pipe(
        map(res => extractGqlData<UpdateMoleculeItemNameMutation, 'updateMoleculeItem'>(res, 'updateMoleculeItem', true)),
        map(node => node ? mapMoleculeItemDtoToClient(node) : null)
      )
  }

  updateItemCanonicalSmiles(id: string, canonicalSmiles: string, type: 'custom', propertiesJson: string): Observable<MoleculeCollectionItemClient | null> {
    return this.apollo
      .mutate<UpdateMoleculeItemCanonicalSmilesMutation, UpdateMoleculeItemCanonicalSmilesMutationVariables>({
        mutation: UpdateMoleculeItemCanonicalSmilesDocument,
        variables: { id, canonicalSmiles, type, propertiesJson }
      })
      .pipe(
        map(res => extractGqlData<UpdateMoleculeItemCanonicalSmilesMutation, 'updateMoleculeItem'>(res, 'updateMoleculeItem', true)),
        map(node => node ? mapMoleculeItemDtoToClient(node) : null)
      )
  }

  markItemAsTouched(id: string, flagIds: string): Observable<boolean> {
    return this.apollo
      .mutate<MarkMoleculeCollectionItemAsTouchedMutation, MarkMoleculeCollectionItemAsTouchedMutationVariables>({
        mutation: MarkMoleculeCollectionItemAsTouchedDocument,
        variables: { id, flagIds }
      }).pipe(
        map(res => extractGqlData<MarkMoleculeCollectionItemAsTouchedMutation, 'markMoleculeCollectionItemAsTouched'>(res, 'markMoleculeCollectionItemAsTouched'))
      )
  }


  // DELETE
  deleteItem(id: string): Observable<boolean> {
    return this.apollo
      .mutate<DeleteMoleculeItemMutation, DeleteMoleculeItemMutationVariables>({
        mutation: DeleteMoleculeItemDocument,
        variables: { id },
      })
      .pipe(map(res => extractGqlData<DeleteMoleculeItemMutation, 'deleteMoleculeItem'>(res, 'deleteMoleculeItem')));
  }

  // Utility: dati essenziali per custom
  getCustomSmilesById(id: string): Observable<{ id: string; canonicalSmiles: string; name: string | null; molFormula: string | null; }> {
    return this.apollo
      .query<MoleculeItemQuery, MoleculeItemQueryVariables>({
        query: MoleculeItemDocument,
        variables: { id },
        fetchPolicy: 'no-cache',
      })
      .pipe(
        map(res => extractGqlData<MoleculeItemQuery, 'moleculeItem'>(res, 'moleculeItem', true)),
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
