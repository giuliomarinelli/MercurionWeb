import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { RdkitAreSameStructureDTO, RdkitGetMoleculePropertiesDTO, RdkitGetMoleculePropertiesResult, RdkitToCanonicalSmilesDTO } from '../Models/rdkit-api.models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RdKitApiService {

  private readonly http = inject(HttpClient)

  getMoleculeProperties(dto: RdkitGetMoleculePropertiesDTO): Observable<RdkitGetMoleculePropertiesResult> {
    return this.http.post<RdkitGetMoleculePropertiesResult>('/api/rdkit-api/get-molecule-properties', dto, {
      withCredentials: true
    })
  }

  toCanonicalSmiles(dto: RdkitToCanonicalSmilesDTO): Observable<string> {
    return this.http.post('/api/rdkit-api/to-canonical-smiles', dto, {
      withCredentials: true,
      responseType: 'text'
    })
  }

  areSameStructure(dto: RdkitAreSameStructureDTO): Observable<boolean> {
    return this.http.post<boolean>('/api/rdkit-api/are-same-structure', dto, {
      withCredentials: true
    })
  }

}
