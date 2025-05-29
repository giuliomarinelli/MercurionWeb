import { Component, OnDestroy, OnInit } from '@angular/core';

import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { LabNotebookEntry } from '../../../Models/notebook/lab-notebook-entry-model.interface';
import { NotebookService } from '../../../services/notebook.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-notebook-list',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="p-4">
      <h2 class="text-xl font-semibold mb-4">Le tue note</h2>
      <button (click)="goToNew()" class="flex justify-center items-center mb-4 gap-3 p-2.5 bg-light-accent-primary dark:bg-dark-accent-primary hover:bg-light-accent-primary/90 hover:dark:bg-dark-accent-primary/90 text-slate-50 rounded transition-colors duration-300">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="w-auto h-5">
          <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
          <path class="fill-current text-slate-100"
            d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM232 344l0-64-64 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l64 0 0-64c0-13.3 10.7-24 24-24s24 10.7 24 24l0 64 64 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-64 0 0 64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"/>
        </svg>
        <span>Nuova nota</span>
      </button>
      @if (!notes.length) {
        <span class="text-sm ">Non ci sono note</span>
      } @else {
        <ul>
          @for (note of notes; track note) {
            <li class="mb-2 border p-2 rounded shadow-sm">
              <a [routerLink]="['/notebook/edit', note.id]" class="font-bold">{{ note.title }}</a>
              <div class="text-sm text-gray-500">{{ formatDate(note.createdAt) }}</div>
            </li>
          }
        </ul>
        }
    </div>
  `
})
export class NotebookListComponent implements OnInit, OnDestroy {

  private notesSub: Subscription | undefined

  notes: LabNotebookEntry[] = []

  constructor(
    private readonly notebookService: NotebookService,
    private readonly router: Router,
    private readonly authService: AuthService
  ) { }

  ngOnInit(): void {
    const userId = this.authService.getLoggedUserId()
    this.notebookService.getNotes(userId ?? '').subscribe({
      next: n => this.notes = n,
      error: err => console.error(err.error)
    })
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
