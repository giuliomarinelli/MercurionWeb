import { Injectable, signal, computed } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map, tap } from 'rxjs';

function extractGqlData<T>(res: any, field: keyof T): any {
  if (res.errors && res.errors.length) throw new Error(`GqlError::${res.errors.map((e: any) => e.message).join(', ')}`);
  if (!res.data || !res.data[field]) throw new Error('GqlError::NoData');
  return res.data[field];
}

// --- TYPES ---
export interface MoleculeCollectionItemJoinShort {
  id: string;
  item: { id: string; label?: string | null; type: string; };
}
export interface MoleculeCollection {
  id: string;
  name: string;
  items?: MoleculeCollectionItemJoinShort[];
}

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
}
