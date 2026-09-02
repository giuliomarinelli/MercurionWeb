import { MoleculeSearchResult } from './../../Models/graphql/molecule-search/molecule-search-result.interface';
import { inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, Observable, of, switchMap, throwError } from 'rxjs';
import { MoleculeDetail } from '../../Models/graphql/molecule.detail.models';
import {
  GetMoleculeDetailDocument,
  GetMoleculeDetailQuery,
  GetMoleculeDetailQueryVariables,
  MoleculePreviewsByMolregnosDocument,
  MoleculePreviewsByMolregnosQuery,
  MoleculePreviewsByMolregnosQueryVariables
} from '../../generated/graphql';

@Injectable({
  providedIn: 'root'
})
export class MoleculeService {

  private readonly apollo = inject(Apollo)

  getMoleculeByMolregno(molregno: string): Observable<MoleculeDetail> {
    return this.apollo
      .watchQuery<GetMoleculeDetailQuery, GetMoleculeDetailQueryVariables>({
        query: GetMoleculeDetailDocument,
        variables: { molregno },
        fetchPolicy: 'cache-first',
        context: {
          credentials: 'include'
        }
      })
      .valueChanges.pipe(
        map(result => result.data.moleculeByMolregno),
        switchMap(mol => {
          if (mol == null) {
            return throwError(() => new Error('MOLECULE_NOT_FOUND'))
          }
          return of(mol)
        })
      )
  }

  getMoleculePreviewsByMolregnos(molregnos: string[]): Observable<MoleculeSearchResult[]> {
    return this.apollo
      .watchQuery<MoleculePreviewsByMolregnosQuery, MoleculePreviewsByMolregnosQueryVariables>({
        query: MoleculePreviewsByMolregnosDocument,
        variables: { molregnos },
        fetchPolicy: 'cache-first',
        context: {
          credentials: 'include'
        }
      }).valueChanges.pipe(
        map(result => result.data.moleculePreviewsByMolregnos)
      )
  }

}
