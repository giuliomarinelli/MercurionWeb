import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { T1PredictionDTO } from '../Models/notebook/t1-prediction-model';

@Injectable({
  providedIn: 'root'
})
export class MercurionAiService {

  constructor(private readonly http: HttpClient) { }

  t1Inference(smilesDTO: { smiles: string }): Observable<T1PredictionDTO> {
    return this.http.post('/api/mercurion-ai/tox-21/infer', smilesDTO, {
      withCredentials: true
    })
  }

}
