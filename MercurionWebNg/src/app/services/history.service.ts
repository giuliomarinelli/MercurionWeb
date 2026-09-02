import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { distinctUntilChanged, map, Observable } from 'rxjs';
import { HistoryDTOExt } from '../Models/history.models';
import type { HistoryDTO, PageModel } from '@mercurion/rest-contracts'

@Injectable({
  providedIn: 'root'
})
export class HistoryService {

  private readonly http = inject(HttpClient)
  // ==============================================

  getHistory(page = 1, limit = 20): Observable<PageModel<HistoryDTOExt>> {
    return this.http.get<PageModel<HistoryDTO>>(`/api/history?page=${page}&limit=${limit}`, {
      withCredentials: true
    }).pipe(
      distinctUntilChanged(),
      map((h) => ({
        ...h,
        items: h.items.map((it) => ({
          ...it,
          selected: signal<boolean>(false)
        }))
      }))
    )
  }

  deleteHistory(): Observable<boolean> {
    return this.http.delete<boolean>('/api/history', {
      withCredentials: true
    })
  }

}
