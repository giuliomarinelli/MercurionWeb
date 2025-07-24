import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { KetcherFrameComponent, KetcherFrameMode } from '../../components/chem/ketcher-frame/ketcher-frame.component';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-molecule-editor',
  imports: [KetcherFrameComponent],
  template: `

    <app-ketcher-frame
       [smiles]=""
       [mode]="mode()"
       (exportSmiles)="onSmilesExported($event)"
    >
    <!-- proiezione contenuto -->
    </app-ketcher-frame>

  `
})
export class MoleculeEditorComponent implements OnInit, OnDestroy {

  private routeSub?: Subscription

  mode = signal<KetcherFrameMode>('edit')
  smiles = signal<string>('')
  mId = signal<string | undefined>(undefined) // undefined per mode !== 'edit' (in creazione e modifica = ricreazione da modello non c'è ancora id e lato GraphQL si userà una mutation di creazione)

  constructor(private readonly route: ActivatedRoute) { }

  ngOnInit(): void {
    this.routeSub = this.route.queryParams.subscribe(qp => {
      const mode = qp['mode'] as KetcherFrameComponent
      if (!['edit', 'create', 'duplicate'].includes(qp['mode'])) {
        //gestione errore validazione
        return
      }
      // se edit bisogna fare chiamata api, se duplicate è come una create ma deve arrivare un query param con le smiles da cui partire
      // va fatta validazione, non va mostrato l'editor e mostrato messaggio di errore
    })

  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe()
  }

  onSmilesExported(e: string) {
    console.log(e)
  }

}
