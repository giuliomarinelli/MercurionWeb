import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { LabNotebookEntry } from '../../../Models/notebook/lab-notebook-entry-model.interface';
import { NotebookService } from '../../../services/notebook.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notebook-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="p-4">
      <h2 class="text-xl font-semibold mb-4">Le tue note</h2>
      <button (click)="goToNew()" class="mb-4 p-2 bg-blue-500 text-white rounded">➕ Nuova nota</button>
      <ul>
        <li *ngFor="let note of notes" class="mb-2 border p-2 rounded shadow-sm">
          <a [routerLink]="['/notebook/edit', note.id]" class="font-bold">{{ note.title }}</a>
          <div class="text-sm text-gray-500">{{ formatDate(note.createdAt) }}</div>
        </li>
      </ul>
    </div>
  `
})
export class NotebookListComponent implements OnInit, OnDestroy {

  private notesSub: Subscription | undefined

  notes: LabNotebookEntry[] = []

  constructor(
    private readonly notebookService: NotebookService,
    private readonly router: Router
  ) { }

  ngOnInit(): void {
    const userId = localStorage.getItem('userId') ?? ''; // tramite AuthService
    this.notebookService.getNotes(userId).subscribe(n => this.notes = n)
  }

  ngOnDestroy(): void {
    this.notesSub?.unsubscribe()
  }

  goToNew() {
    this.router.navigate(['/notebook/new'])
  }

  formatDate(ms: number) {
    return new Date(ms).toLocaleString()
  }
}
