import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Molecule } from '../Models/types/interfaces/molecule.interface';

@Injectable({
  providedIn: 'root',
})
export class MoleculeSearchService {
  constructor(private apollo: Apollo) {}

  search(query: string, limit = 10): Observable<Molecule[]> {
    return this.apollo
      .query<{ moleculeSearch: Molecule[] }>({
        query: gql`
          query MoleculeSearch($query: String!, $limit: Int!) {
            moleculeSearch(input: { query: $query, limit: $limit }) {
              id
              preferredName
              mwFreebase
              smiles
              maxPhase
              alogp
            }
          }
        `,
        variables: {
          query,
          limit,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(map(result => result.data.moleculeSearch))
  }
}
