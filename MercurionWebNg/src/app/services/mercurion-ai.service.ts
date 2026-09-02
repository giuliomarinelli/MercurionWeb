import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { SmilesDTO, Tox21Prediction } from '@mercurion/rest-contracts'

@Injectable({
  providedIn: 'root'
})
export class MercurionAiService {

  constructor(private readonly http: HttpClient) { }

  t1Inference(smilesDTO: SmilesDTO): Observable<Tox21Prediction> {
    return this.http.post<Tox21Prediction>('/api/mercurion-ai/tox-21/infer', smilesDTO, {
      withCredentials: true
    })
  }

}
