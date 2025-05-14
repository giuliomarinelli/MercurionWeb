import { AuthService } from './auth.service';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LabNotebookEntry } from '../Models/notebook/lab-notebook-entry-model.interface';

@Injectable({ providedIn: 'root' })
export class NotebookService {

  private readonly baseUrl = '/api/notebook'

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) { }

  getNotes(userId: string): Observable<LabNotebookEntry[]> {
    return this.http.get<LabNotebookEntry[]>(`${this.baseUrl}/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${this.authService.accessToken ?? ''}`
      }
    })
  }

  getNote(id: string): Observable<LabNotebookEntry> {
    return this.http.get<LabNotebookEntry>(`${this.baseUrl}/${id}`, {
      headers: {
        'Authorization': `Bearer ${this.authService.accessToken ?? ''}`
      }
    })
  }

  createNote(payload: Partial<LabNotebookEntry>): Observable<LabNotebookEntry> {
    return this.http.post<LabNotebookEntry>(this.baseUrl, payload, {
      headers: {
        'Authorization': `Bearer ${this.authService.accessToken ?? ''}`
      }
    })
  }

  updateNote(id: string, payload: Partial<LabNotebookEntry>): Observable<LabNotebookEntry> {
    return this.http.patch<LabNotebookEntry>(`${this.baseUrl}/${id}`, payload, {
      headers: {
        'Authorization': `Bearer ${this.authService.accessToken ?? ''}`
      }
    })
  }

  deleteNote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, {
      headers: {
        'Authorization': `Bearer ${this.authService.accessToken ?? ''}`
      }
    })
  }

}
