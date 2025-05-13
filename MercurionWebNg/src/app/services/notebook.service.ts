import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LabNotebookEntry } from '../Models/notebook/lab-notebook-entry-model.interface';

@Injectable({ providedIn: 'root' })
export class NotebookService {

  private readonly baseUrl = '/api/notebook'

  constructor(private readonly http: HttpClient) {}

  getNotes(userId: string): Observable<LabNotebookEntry[]> {
    return this.http.get<LabNotebookEntry[]>(`${this.baseUrl}/user/${userId}`)
  }

  getNote(id: string): Observable<LabNotebookEntry> {
    return this.http.get<LabNotebookEntry>(`${this.baseUrl}/${id}`)
  }

  createNote(payload: Partial<LabNotebookEntry>): Observable<LabNotebookEntry> {
    return this.http.post<LabNotebookEntry>(this.baseUrl, payload)
  }

  updateNote(id: string, payload: Partial<LabNotebookEntry>): Observable<LabNotebookEntry> {
    return this.http.patch<LabNotebookEntry>(`${this.baseUrl}/${id}`, payload)
  }

  deleteNote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`)
  }

}
