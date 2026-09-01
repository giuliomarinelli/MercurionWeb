import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import type {
  CreateFeedbackDTO,
  DeleteFeedbackResponse,
  Feedback,
  FeedbackEnv,
  FeedbackStatus,
  PageModel,
  UpdateFeedbackDTO
} from '@mercurion/rest-contracts'

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {

  private readonly http = inject(HttpClient)

  private readonly base = '/api/feedback'

  createFeedback(dto: CreateFeedbackDTO): Observable<Feedback> {
    return this.http.post<Feedback>(this.base, dto, {
      withCredentials: true
    })
  }

  listFeedbacks(page = 1, limit = 20, env?: FeedbackEnv, status?: FeedbackStatus): Observable<PageModel<Feedback>> {
    let query = `?page=${page}&limit=${limit}`
    if (env) {
      query += `&env=${env}`
    }
    if (status) {
      query += `&status=${status}`
    }
    return this.http.get<PageModel<Feedback>>(`${this.base}${query}`, {
      withCredentials: true
    })
  }

  getFeedbackById(id: string): Observable<Feedback> {
    return this.http.get<Feedback>(`${this.base}/${id}`, {
      withCredentials: true
    })
  }

  moderateFeedback(id: string, dto: UpdateFeedbackDTO): Observable<Feedback> {
    return this.http.patch<Feedback>(`${this.base}/${id}`, dto, {
      withCredentials: true
    })
  }

  deleteFeedback(id: string): Observable<boolean> {
    return this.http.delete<DeleteFeedbackResponse>(`${this.base}/${id}`, {
      withCredentials: true
    }).pipe(
      map(({ ok }) => ok)
    )
  }

}
