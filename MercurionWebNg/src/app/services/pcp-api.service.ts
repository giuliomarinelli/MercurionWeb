import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PcpApiService {

  private readonly http = inject(HttpClient)

  private readonly BASE = '/api/pcp-api/'

  getIupacNameFromSmiles(smiles: string): Observable<string> {
    return this.http.post(`${this.BASE}get-iupac-name-from-smiles`, { smiles }, {
      withCredentials: true,
      responseType: 'text'
    })
  }


}
