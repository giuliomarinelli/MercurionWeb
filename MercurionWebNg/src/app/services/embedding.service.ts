import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmbeddingService {

  constructor(private readonly http: HttpClient) { }

  getSimilarMolregnos(molregno: string, n: number = 10, with_no_name: boolean = false, only_molregnos = true): Observable<string[]> {
    return this.http.get<string[]>(`/api/embedding/get-similar-molregnos?molregno=${molregno}&n=${n}&with_no_name=${with_no_name}&only_molregnos=${only_molregnos}`, {
      withCredentials: true
    })
  }

}
