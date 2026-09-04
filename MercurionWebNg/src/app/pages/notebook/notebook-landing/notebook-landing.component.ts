import { Component, DestroyRef, inject, OnInit, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotebookService } from '../../../services/graphql/notebook.service';
import { NotebookTree } from '../../../Models/graphql/notebook/notebook.models';
import { NotebookTreeComponent } from '../../../components/notebook/notebook-tree/notebook-tree.component';

@Component({
  selector: 'm-notebook-landing',
  imports: [NotebookTreeComponent],
  template: `

    <main role="main" aria-live="polite" [attr.aria-busy]="loading()" class="block">
      <h1 id="notebook-landing-heading" class="text-6xl text-center mb-3">Hola</h1>
      <m-notebook-tree [notebooks]="notebooks()" aria-labelledby="notebook-landing-heading" />
    </main>
  `
})
export class NotebookLandingComponent implements OnInit {

  protected notebooks = signal<NotebookTree[]>([])
  protected loading = signal<boolean>(false)
  private readonly destroyRef = inject(DestroyRef)

  constructor(private notebookService: NotebookService) { }

  ngOnInit() {
    this.notebookService.getAllNotebooks().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: res => {
        this.notebooks.set(res)
        console.log(res)
      },
      error: err => {
        this.loading.set(false);
        alert(err.message)
      }
    })
  }

  createNotebook(title: string) {
    this.notebookService.createNotebook(title).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => this.notebookService.refreshNotebooks(),
      error: err => alert(err.message)
    });
  }

}
