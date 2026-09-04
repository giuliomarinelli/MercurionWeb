import { DuplicateCollectionRes } from './../../Models/graphql/molecule-collection/molecule-collection.types';
import { Injectable, signal, computed } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable, map, tap } from 'rxjs';
import { BindManyCollectionsToMoleculeDTO, MoleculeCollection } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { PageModel } from '../../Models/graphql/page.models';
import { extractGqlData } from './graphql-helpers/v1/extract-gql-data.helper';
import {
  BindManyCollectionsToMoleculeDocument,
  BindManyCollectionsToMoleculeMutation,
  BindManyCollectionsToMoleculeMutationVariables,
  CreateMoleculeCollectionDocument,
  CreateMoleculeCollectionMutation,
  CreateMoleculeCollectionMutationVariables,
  CreateMoleculeCollectionWithItemsDocument,
  CreateMoleculeCollectionWithItemsMutation,
  CreateManyMoleculeCollectionsDocument,
  CreateManyMoleculeCollectionsMutation,
  CreateManyMoleculeCollectionsMutationVariables,
  DeleteMoleculeCollectionDocument,
  DeleteMoleculeCollectionMutation,
  DeleteMoleculeCollectionMutationVariables,
  DuplicateCollectionDocument,
  DuplicateCollectionMutation,
  DuplicateCollectionMutationVariables,
  MarkMoleculeCollectionAsTouchedDocument,
  MarkMoleculeCollectionAsTouchedMutation,
  MarkMoleculeCollectionAsTouchedMutationVariables,
  MoleculeCollectionDocument,
  MoleculeCollectionQuery,
  MoleculeCollectionQueryVariables,
  MoleculeCollectionWithItemsDocument,
  MoleculeCollectionWithItemsQuery,
  MyMoleculeCollectionsDocument,
  MyMoleculeCollectionsQuery,
  MyMoleculeCollectionsWithItemsDocument,
  MyMoleculeCollectionsWithItemsQuery,
  PaginatedCollectionsDocument,
  PaginatedCollectionsQuery,
  PaginatedCollectionsQueryVariables,
  UpdateMoleculeCollectionDocument,
  UpdateMoleculeCollectionMutation,
  UpdateMoleculeCollectionMutationVariables,
  UpdateMoleculeCollectionWithItemsDocument,
  UpdateMoleculeCollectionWithItemsMutation,
  UpdateMoleculeCollectionNameDocument,
  UpdateMoleculeCollectionNameMutation,
  UpdateMoleculeCollectionNameMutationVariables
} from '../../generated/graphql';

// --- OPTION OBJECT ---
export interface CollectionFieldsOptions {
  withItems?: boolean;
}

type CollectionListQuery =
  | MyMoleculeCollectionsQuery
  | MyMoleculeCollectionsWithItemsQuery;
type CollectionDetailQuery =
  | MoleculeCollectionQuery
  | MoleculeCollectionWithItemsQuery;
type CreateCollectionMutation =
  | CreateMoleculeCollectionMutation
  | CreateMoleculeCollectionWithItemsMutation;
type UpdateCollectionMutation =
  | UpdateMoleculeCollectionMutation
  | UpdateMoleculeCollectionWithItemsMutation;

@Injectable({ providedIn: 'root' })
export class MoleculeCollectionService {
  private _collections = signal<MoleculeCollection[]>([]);
  private _loading = signal<boolean>(false);

  readonly collections = computed(() => this._collections());
  readonly loading = computed(() => this._loading());

  constructor(private apollo: Apollo) { }

  // GET ALL
  getAllCollections(opts: CollectionFieldsOptions = {}): Observable<MoleculeCollection[]> {
    this._loading.set(true);
    const query = opts.withItems
      ? MyMoleculeCollectionsWithItemsDocument
      : MyMoleculeCollectionsDocument;
    return this.apollo
      .watchQuery<CollectionListQuery>({
        query,
        fetchPolicy: 'network-only' })
      .valueChanges.pipe(
        map(res => extractGqlData<CollectionListQuery, 'myMoleculeCollections'>(
          res,
          'myMoleculeCollections',
        ) as MoleculeCollection[]),
        tap(collections => {
          this._collections.set(collections);
          this._loading.set(false);
        })
      );
  }

  // GET BY ID
  getCollectionById(id: string, opts: CollectionFieldsOptions = {}): Observable<MoleculeCollection | null> {
    const query = opts.withItems
      ? MoleculeCollectionWithItemsDocument
      : MoleculeCollectionDocument;
    return this.apollo
      .watchQuery<CollectionDetailQuery, MoleculeCollectionQueryVariables>({
        query,
        variables: { id },
        fetchPolicy: 'network-only' })
      .valueChanges.pipe(
        map(res => extractGqlData<CollectionDetailQuery, 'moleculeCollection'>(
          res,
          'moleculeCollection',
          true,
        ) as MoleculeCollection | null),
      );
  }

  getPaginatedCollections(
    page: number = 1,
    limit: number = 20,
    q: string,
    excludeJoinedToMolecule: boolean | null = null,
    moleculeId: string | null = null
  ): Observable<PageModel<MoleculeCollection>> {
    return this.apollo
      .watchQuery<PaginatedCollectionsQuery, PaginatedCollectionsQueryVariables>({
        query: PaginatedCollectionsDocument,
        variables: {
          page,
          limit,
          q,
          excludeJoinedToMolecule,
          moleculeId
        },
        fetchPolicy: 'network-only'
      })
      .valueChanges.pipe(
        map(res => extractGqlData<PaginatedCollectionsQuery, 'myMoleculeCollectionsPaginated'>(res, 'myMoleculeCollectionsPaginated'))
      )
  }


  // CREATE
  createCollection(name: string, opts: CollectionFieldsOptions = {}): Observable<MoleculeCollection> {
    const mutation = opts.withItems
      ? CreateMoleculeCollectionWithItemsDocument
      : CreateMoleculeCollectionDocument;
    return this.apollo
      .mutate<CreateCollectionMutation, CreateMoleculeCollectionMutationVariables>({
        mutation,
        variables: { name } })
      .pipe(
        map(res => extractGqlData<CreateCollectionMutation, 'createMoleculeCollection'>(
          res,
          'createMoleculeCollection',
        ) as MoleculeCollection),
      );
  }

  createManyCollections(names: string[]): Observable<boolean> {
    return this.apollo
      .mutate<CreateManyMoleculeCollectionsMutation, CreateManyMoleculeCollectionsMutationVariables>({
        mutation: CreateManyMoleculeCollectionsDocument,
        variables: {
          names
        }
      }).pipe(
        map(res => extractGqlData<CreateManyMoleculeCollectionsMutation, 'createManyMoleculeCollections'>(res, 'createManyMoleculeCollections'))
      )
  }

  markMoleculeCollectionAsTouched(id: string): Observable<boolean> {
    return this.apollo
      .mutate<MarkMoleculeCollectionAsTouchedMutation, MarkMoleculeCollectionAsTouchedMutationVariables>({
        mutation: MarkMoleculeCollectionAsTouchedDocument,
        variables: { id }
      }).pipe(
        map(res => extractGqlData<MarkMoleculeCollectionAsTouchedMutation, 'markMoleculeCollectionAsTouched'>(res, 'markMoleculeCollectionAsTouched'))
      )
  }

  // UPDATE
  updateCollection(id: string, name: string, opts: CollectionFieldsOptions = {}): Observable<MoleculeCollection | null> {
    const mutation = opts.withItems
      ? UpdateMoleculeCollectionWithItemsDocument
      : UpdateMoleculeCollectionDocument;
    return this.apollo
      .mutate<UpdateCollectionMutation, UpdateMoleculeCollectionMutationVariables>({
        mutation,
        variables: { id, name } })
      .pipe(
        map(res => extractGqlData<UpdateCollectionMutation, 'updateMoleculeCollection'>(
          res,
          'updateMoleculeCollection',
          true,
        ) as MoleculeCollection | null),
      );
  }

  updateCollectionName(
    id: string,
    name: string
  ): Observable<UpdateMoleculeCollectionNameMutation['updateMoleculeCollection']> {
    return this.apollo
      .mutate<UpdateMoleculeCollectionNameMutation, UpdateMoleculeCollectionNameMutationVariables>({
        mutation: UpdateMoleculeCollectionNameDocument,
        variables: {
          id, name
        }
      }).pipe(
        map(res => extractGqlData<UpdateMoleculeCollectionNameMutation, 'updateMoleculeCollection'>(res, 'updateMoleculeCollection'))
      )
  }

  duplicateCollection(srcCollectionId: string): Observable<DuplicateCollectionRes> {
    return this.apollo
      .mutate<DuplicateCollectionMutation, DuplicateCollectionMutationVariables>({
        mutation: DuplicateCollectionDocument,
        variables: {
          srcCollectionId
        }
      }).pipe(
        map((res) => extractGqlData<DuplicateCollectionMutation, 'duplicateCollection'>(res, 'duplicateCollection')),
        map((col) => {
          const { id, name } = col
          return {
            id,
            name
          }
        })
      )
  }

  // DELETE
  deleteCollection(id: string): Observable<boolean> {
    return this.apollo
      .mutate<DeleteMoleculeCollectionMutation, DeleteMoleculeCollectionMutationVariables>({
        mutation: DeleteMoleculeCollectionDocument,
        variables: { id } })
      .pipe(map(res => extractGqlData<DeleteMoleculeCollectionMutation, 'deleteMoleculeCollection'>(res, 'deleteMoleculeCollection')));
  }

  bindManyCollectionsToMolecule(moleculeId: string, collectionIds: string[], selectAll: boolean): Observable<BindManyCollectionsToMoleculeDTO> {
    return this.apollo
      .mutate<BindManyCollectionsToMoleculeMutation, BindManyCollectionsToMoleculeMutationVariables>({
        mutation: BindManyCollectionsToMoleculeDocument,
        variables: {
          moleculeId,
          collectionIds,
          selectAll
        }
      }).pipe(
        map(res => extractGqlData<BindManyCollectionsToMoleculeMutation, 'bindManyCollectionsToMolecule'>(res, 'bindManyCollectionsToMolecule'))
      )
  }

}
