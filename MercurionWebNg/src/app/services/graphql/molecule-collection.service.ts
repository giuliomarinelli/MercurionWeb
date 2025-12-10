import { Injectable, signal, computed } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map, tap } from 'rxjs';
import { BindManyCollectionsToMoleculeDTO, MoleculeCollection } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { PageModel } from '../../Models/graphql/page.models';
import { BIND_MANY_COLLECTIONS_TO_MOLECULE, CREATE_MANY_MOLECULE_COLLECTIONS, MARK_MOLECULE_COLLECTION_AS_TOUCHED, PAGINATED_MOLECULE_COLLECTIONS, UPDATE_MOLECULE_COLLECTION_NAME } from './graphql-operations/molecule-collection.gql-operations';
import { extractGqlData } from './graphql-helpers/extract-gql-data.gql-helper';


// --- OPTION OBJECT ---
export interface CollectionFieldsOptions {
  withItems?: boolean;
}

// --- FIELDS BUILDER ---
function buildCollectionFields(opts: CollectionFieldsOptions = {}): string {
  let fields = `
    id
    name
  `;
  if (opts.withItems) {
    fields += `
      items {
        id
        item { id label type }
      }
    `;
  }
  return fields;
}

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
    const FIELDS = buildCollectionFields(opts);
    const query = gql`
      query MyMoleculeCollections {
        myMoleculeCollections {
          ${FIELDS}
        }
      }
    `;
    return this.apollo
      .watchQuery<{ myMoleculeCollections: MoleculeCollection[] }>({
        query,
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        map(res => extractGqlData(res, 'myMoleculeCollections')),
        tap(collections => {
          this._collections.set(collections);
          this._loading.set(false);
        })
      );
  }

  // GET BY ID
  getCollectionById(id: string, opts: CollectionFieldsOptions = {}): Observable<MoleculeCollection | null> {
    const FIELDS = buildCollectionFields(opts);
    const query = gql`
      query MoleculeCollection($id: ID!) {
        moleculeCollection(id: $id) {
          ${FIELDS}
        }
      }
    `;
    return this.apollo
      .watchQuery<{ moleculeCollection: MoleculeCollection | null }>({
        query,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(map(res => extractGqlData(res, 'moleculeCollection')));
  }

  getPaginatedCollections(
    page: number = 1,
    limit: number = 20,
    q: string,
    excludeJoinedToMolecule: boolean | null = null,
    moleculeId: string | null = null
  ): Observable<PageModel<MoleculeCollection>> {
    return this.apollo
      .watchQuery<{ myMoleculeCollectionsPaginated: any }>({
        query: PAGINATED_MOLECULE_COLLECTIONS,
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
        map(res => extractGqlData(res, 'myMoleculeCollectionsPaginated'))
      )
  }


  // CREATE
  createCollection(name: string, opts: CollectionFieldsOptions = {}): Observable<MoleculeCollection> {
    const FIELDS = buildCollectionFields(opts);
    const mutation = gql`
      mutation CreateMoleculeCollection($name: String!) {
        createMoleculeCollection(name: $name) {
          ${FIELDS}
        }
      }
    `;
    return this.apollo
      .mutate<{ createMoleculeCollection: MoleculeCollection }>({
        mutation,
        variables: { name },
      })
      .pipe(map(res => extractGqlData(res, 'createMoleculeCollection')));
  }

  createManyCollections(names: string[]): Observable<boolean> {
    return this.apollo
      .mutate<{ createManyMoleculeCollections: boolean }>({
        mutation: CREATE_MANY_MOLECULE_COLLECTIONS,
        variables: {
          names
        }
      }).pipe(
        map(res => extractGqlData(res, 'createManyMoleculeCollections'))
      )
  }

  markMoleculeCollectionAsTouched(id: string): Observable<boolean> {
    return this.apollo
      .mutate<{ markMoleculeCollectionAsTouched: boolean }>({
        mutation: MARK_MOLECULE_COLLECTION_AS_TOUCHED,
        variables: { id }
      }).pipe(
        map(res => extractGqlData(res, 'markMoleculeCollectionAsTouched'))
      )
  }

  // UPDATE
  updateCollection(id: string, name: string, opts: CollectionFieldsOptions = {}): Observable<MoleculeCollection | null> {
    const FIELDS = buildCollectionFields(opts);
    const mutation = gql`
      mutation UpdateMoleculeCollection($id: ID!, $name: String!) {
        updateMoleculeCollection(id: $id, name: $name) {
          ${FIELDS}
        }
      }
    `;
    return this.apollo
      .mutate<{ updateMoleculeCollection: MoleculeCollection | null }>({
        mutation,
        variables: { id, name },
      })
      .pipe(map(res => extractGqlData(res, 'updateMoleculeCollection')));
  }

  updateCollectionName(id: string, name: string): Observable<MoleculeCollection | null> {
    return this.apollo
      .mutate<{ updateMoleculeCollection: MoleculeCollection | null }>({
        mutation: UPDATE_MOLECULE_COLLECTION_NAME,
        variables: {
          id, name
        }
      }).pipe(
        map(res => extractGqlData(res, 'updateMoleculeCollection'))
      )
  }

  // DELETE
  deleteCollection(id: string): Observable<boolean> {
    const mutation = gql`
      mutation DeleteMoleculeCollection($id: ID!) {
        deleteMoleculeCollection(id: $id)
      }
    `;
    return this.apollo
      .mutate<{ deleteMoleculeCollection: boolean }>({
        mutation,
        variables: { id },
      })
      .pipe(map(res => extractGqlData(res, 'deleteMoleculeCollection')));
  }

  bindManyCollectionsToMolecule(moleculeId: string, collectionIds: string[], selectAll: boolean): Observable<BindManyCollectionsToMoleculeDTO> {
    return this.apollo
      .mutate<{ bindManyCollectionsToMolecule: BindManyCollectionsToMoleculeDTO }>({
        mutation: BIND_MANY_COLLECTIONS_TO_MOLECULE,
        variables: {
          moleculeId,
          collectionIds,
          selectAll
        }
      }).pipe(
        map(res => extractGqlData(res, 'bindManyCollectionsToMolecule'))
      )
  }

}
