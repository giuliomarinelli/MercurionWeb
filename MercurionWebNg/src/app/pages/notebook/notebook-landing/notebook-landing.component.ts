import { Component, OnDestroy, OnInit, signal, Signal } from '@angular/core';
import { NotebookService } from '../../../services/graphql/notebook.service';
import { NotebookTree } from '../../../Models/graphql/notebook/notebook.models';
import { NotebookTreeComponent } from '../../../components/notebook/notebook-tree/notebook-tree.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'm-notebook-landing',
  imports: [NotebookTreeComponent],
  template: `

    <h1 class="text-6xl text-center mb-3">Hola</h1>
    <m-notebook-tree [notebooks]="notebooks()" />
  `
})
export class NotebookLandingComponent implements OnInit, OnDestroy {

  protected notebooks = signal<NotebookTree[]>([])
  protected loading = signal<boolean>(false)
  private notebookSub: Subscription | undefined

  constructor(private notebookService: NotebookService) { }

  ngOnInit() {
    this.notebookSub = this.notebookService.getAllNotebooks().subscribe({
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
    this.notebookService.createNotebook(title).subscribe({
      next: () => this.notebookService.refreshNotebooks(),
      error: err => alert(err.message)
    });
  }

  ngOnDestroy(): void {
    this.notebookSub?.unsubscribe()
  }

}
