import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { PcpGetIupacNameFromSmilesDTO } from '@mercurion/rest-contracts';

@Injectable({
  providedIn: 'root',
})
export class PcpApiService {

  private readonly http = inject(HttpClient)

  getIupacNameFromSmiles(smiles: string): Observable<string> {
    const dto: PcpGetIupacNameFromSmilesDTO = { smiles };
    return this.http.post('/api/pcp-api/get-iupac-name-from-smiles', dto, {
      withCredentials: true,
      responseType: 'text'
    })
  }


}
