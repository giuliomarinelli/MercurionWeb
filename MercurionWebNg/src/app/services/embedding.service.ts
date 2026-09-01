import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { EmbeddingResponse } from '@mercurion/rest-contracts'

@Injectable({
  providedIn: 'root'
})
export class EmbeddingService {

  constructor(private readonly http: HttpClient) { }

  getSimilarMolregnos(molregno: string, n: number = 10, with_no_name: boolean = true, only_molregnos = true): Observable<EmbeddingResponse> {
    return this.http.get<EmbeddingResponse>(`/api/embedding/get-similar-molregnos?molregno=${molregno}&n=${n}&with_no_name=${with_no_name}&only_molregnos=${only_molregnos}`, {
      withCredentials: true
    })
  }

}
