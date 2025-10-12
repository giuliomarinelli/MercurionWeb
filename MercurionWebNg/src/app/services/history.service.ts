import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PageModel } from '../Models/graphql/page.model';
import { distinctUntilChanged, Observable } from 'rxjs';
import { HistoryDTO } from '../Models/history.models';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {

  private readonly http = inject(HttpClient)
  // ==============================================

  getHistory(page = 1, limit = 20): Observable<PageModel<HistoryDTO>> {
    return this.http.get<PageModel<HistoryDTO>>(`/api/history?page=${page}&limit=${limit}`, {
      withCredentials: true
    }).pipe(
      distinctUntilChanged()
    )
  }

}
