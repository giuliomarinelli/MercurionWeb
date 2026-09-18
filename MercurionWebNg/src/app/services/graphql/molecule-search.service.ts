import { Injectable, computed, signal } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { MoleculeSearchResult } from '../../Models/graphql/molecule-search/molecule-search-result.interface';
import { extractGqlData } from './graphql-helpers/v1/extract-gql-data.helper';
import {
  MoleculeSearchDocument,
  MoleculeSearchQuery,
  MoleculeSearchQueryVariables
} from '../../generated/graphql';
import { GRAPHQL_QUERY_FETCH_POLICY } from './graphql-query-policy';


@Injectable({ providedIn: 'root' })
export class MoleculeSearchService {

  private _results = signal<MoleculeSearchResult[]>([])
  private _loading = signal<boolean>(false)

  readonly results = computed(() => this._results())
  readonly loading = computed(() => this._loading())

  constructor(private apollo: Apollo) { }

  searchMolecule(query: string, limit: number = 10): Observable<MoleculeSearchResult[]> {
    this._loading.set(true)

    return this.apollo
      .query<MoleculeSearchQuery, MoleculeSearchQueryVariables>({
        query: MoleculeSearchDocument,
        variables: {
          input: { query, limit },
        },
        fetchPolicy: GRAPHQL_QUERY_FETCH_POLICY.mutableSnapshot,
      })
      .pipe(
        map(res => extractGqlData<MoleculeSearchQuery, 'moleculeSearch'>(res, 'moleculeSearch')),
        tap(results => {
          this._results.set(results)
          this._loading.set(false)
        })
      );
  }

  clearResults() {
    this._results.set([])
    this._loading.set(false)
  }
}
