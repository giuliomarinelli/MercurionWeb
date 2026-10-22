import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { NotebookService } from '../../../services/graphql/notebook.service';
import { NotebookTree } from '../../../Models/graphql/notebook/notebook.models';
import { NotebookTreeComponent } from '../../../components/notebook/notebook-tree/notebook-tree.component';

@Component({
  selector: 'm-notebook-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NotebookTreeComponent],
  template: `
    <main role="main" class="mx-auto max-w-6xl px-4 py-6" [attr.aria-busy]="loading()">
      <header class="mb-6">
        <h1 class="text-3xl font-semibold">Quaderni di laboratorio</h1>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Organizza le sezioni, i protocolli degli esperimenti e le esecuzioni.
        </p>
      </header>

      @if (error()) {
        <div role="alert" class="mb-4 rounded-md border border-red-500 p-3">
          {{ error() }}
          <button type="button" class="ml-3 underline" (click)="reload()">Riprova</button>
        </div>
      }

      @if (loading()) {
        <p role="status">Caricamento quaderni…</p>
      } @else {
        <m-notebook-tree [notebooks]="notebooks()" mode="edit"
          (changed)="reload()" />
      }
    </main>
  `,
})
export class NotebookLandingComponent implements OnInit {
  private readonly notebookService = inject(NotebookService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly notebooks = signal<NotebookTree[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notebookService.getAllNotebooks().pipe(
      finalize(() => this.loading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: notebooks => this.notebooks.set(notebooks),
      error: (error: unknown) => {
        this.error.set(error instanceof Error ? error.message : 'Impossibile caricare i quaderni.');
      },
    });
  }
}
