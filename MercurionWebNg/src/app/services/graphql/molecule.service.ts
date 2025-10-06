import { MoleculeSearchResult } from './../../Models/graphql/molecule-search/molecule-search-result.interface';
import { inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { GET_MOLECULE_DETAIL, GET_MOLECULE_PREVIEWS } from '../../Models/graphql/molecule.queries';
import { map, Observable } from 'rxjs';
import { MoleculeDetail } from '../../Models/graphql/molecule.detail';

@Injectable({
  providedIn: 'root'
})
export class MoleculeService {

  private readonly apollo = inject(Apollo)

  getMoleculeByMolregno(molregno: string): Observable<MoleculeDetail> {
    return this.apollo
      .watchQuery<{ moleculeByMolregno: MoleculeDetail }>({
        query: GET_MOLECULE_DETAIL,
        variables: { molregno },
        fetchPolicy: 'cache-first',
        context: {
          credentials: 'include'
        }
      })
      .valueChanges.pipe(
        map(result => result.data.moleculeByMolregno)
      )
  }

  getMoleculePreviewsByMolregnos(molregnos: string[]): Observable<MoleculeSearchResult[]> {
    return this.apollo
      .watchQuery<{ moleculePreviewsByMolregnos: MoleculeSearchResult[] }>({
        query: GET_MOLECULE_PREVIEWS,
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
