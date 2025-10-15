import { Injectable, computed, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { MoleculeSearchResult } from '../../Models/graphql/molecule-search/molecule-search-result.interface';
import { extractGqlData } from './graphql-helpers/extract-gql-data.gql-helper';




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
      .watchQuery<{ moleculeSearch: MoleculeSearchResult[] }>({
        query: gql`
          query MoleculeSearch($input: MoleculeSearchInput!) {
            moleculeSearch(input: $input) {
              id
              preferredName
              smiles
              synonyms
              mwFreebase
              alogp
              maxPhase
            }
          }
        `,
        variables: {
          input: { query, limit },
        },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        map(res => extractGqlData(res, 'moleculeSearch')),
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
