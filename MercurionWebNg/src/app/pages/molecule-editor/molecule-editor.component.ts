import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { KetcherFrameComponent, KetcherFrameMode } from '../../components/chem/ketcher-frame/ketcher-frame.component';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { CollectionSaveOverlayContextService } from '../../services/context/save-to-collection-context.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-molecule-editor',
  imports: [KetcherFrameComponent],
  template: `

    <div class="mt-2 mb-6">
      <h2 class="text-center text-light-accent-primary dark:text-dark-accent-primary font-semibold text-xl 2xs:text-2xl sm:text-4xl">
        @switch (mode()) {
          @case ('create') {
            Crea molecola
          }
          @case ('edit') {
            Modifica molecola
          }
          @case ('duplicate') {
            Crea molecola da struttura
          }
        }
      </h2>
    </div>

    @if (!error()) {
      <app-ketcher-frame
         [smiles]="smiles()"
         [mode]="mode()"
         [triggerReset]="triggerReset()"
         [triggerGetSmiles]="triggerGetSmiles()"
         (exportSmiles)="onSmilesExported($event)"
         (onReset)="triggerReset.set(false)"
      >
     <div class="sm:flex flex-col 2xs:flex-row gap-3 mt-5 justify-end max-w-2xl mx-auto hidden">
      <button class="relative bottom-[2px] w-full mt-4 py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary/80 dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary/60 disabled:hover:dark:bg-dark-accent-primary/80"
        (click)="onReset()">Resetta
      </button>
      @if (mode() === 'edit') {
        <button
          class="relative bottom-[2px] w-full mt-4 py-2 text-white rounded-md transition-colors duration-150 bg-emerald-600 hover:bg-light-accent-primary/80 dark:hover:bg-emerald-600/90 disabled:bg-light-accent-primary/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary/60 disabled:hover:dark:bg-dark-accent-primary/80"
          (click)="onSave()">Salva
        </button>
      } @else {
        <button
          class="relative bottom-[2px] w-full mt-4 py-2 text-white rounded-md transition-colors duration-150 bg-emerald-600 hover:bg-light-accent-primary/80 dark:hover:bg-emerald-600/90 disabled:bg-light-accent-primary/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary/60 disabled:hover:dark:bg-dark-accent-primary/80"
          (click)="onSaveAsNew()">Salva
        </button>
      }
    </div>
    </app-ketcher-frame>
    } @else {
      <h3 class="text-center text-5xl font-semibold text-light-error dark:text-dark-error">Si è verificato un errore</h3>
    }

  `
})
export class MoleculeEditorComponent implements OnInit, OnDestroy {

  private routeSub?: Subscription
  private smilesByIdSub?: Subscription

  mode = signal<KetcherFrameMode>('edit')
  smiles = signal<string>('')
  mId = signal<string | undefined>(undefined) // undefined per mode !== 'edit' (in creazione e modifica = ricreazione da modello non c'è ancora id e lato GraphQL si userà una mutation di creazione)
  error = signal<boolean>(false)
  triggerReset = signal<boolean>(false)
  triggerGetSmiles = signal<boolean>(false)
  pendingAction = signal<'save' | 'saveNew' | null>(null)

  constructor(
    private readonly route: ActivatedRoute,
    private readonly moleculeCollectionItemService: MoleculeCollectionItemService,
    private readonly saveContext: CollectionSaveOverlayContextService,
    private readonly toast: ToastService
  ) { }

  ngOnInit(): void {
    this.routeSub = this.route.queryParams.subscribe(qp => {
      const mode = qp['mode'] as KetcherFrameMode
      if (!['edit', 'create', 'duplicate'].includes(mode)) {
        this.error.set(true)
        return
      }
      // se edit bisogna fare chiamata api, se duplicate è come una create ma deve arrivare un query param con le smiles da cui partire
      // va fatta validazione, non va mostrato l'editor e mostrato messaggio di errore
      const mId = qp['m_id']
      if (mode === 'edit' && mId) {
        this.mode.set('edit')
        this.smilesByIdSub = this.moleculeCollectionItemService.getCustomSmilesById(mId).subscribe({
          next: res => {
            if (!res) {
              this.error.set(true)
              return
            }
            this.smiles.set(res.canonicalSmiles)
          },
          error: () => this.error.set(true)
        })
      } else if (mode === 'duplicate' && qp['smiles']) {
        this.smiles.set(qp['smiles'])
        this.mode.set('duplicate')
      } else if (mode === 'create') {
        this.smiles.set('')
        this.mode.set('create')
      } else {
        this.error.set(true)
      }

    })

  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe()
    this.smilesByIdSub?.unsubscribe()
  }

  onSave(): void {
    this.pendingAction.set('save');
    this.triggerGetSmiles.set(true);
  }

  onSaveAsNew(): void {
    this.pendingAction.set('saveNew');
    this.triggerGetSmiles.set(true);
  }

  // Quando le SMILES sono arrivate
  onSmilesExported(e: string) {
    this.triggerGetSmiles.set(false);

    if (this.pendingAction() === 'saveNew') {
      this.doSaveNew(e)
    } else if (this.pendingAction() === 'save') {
      this.doSaveEdit(e)
    }
    this.pendingAction.set(null);
  }

  // Esegui qui il vero salvataggio
  doSaveNew(smiles: string): void {
    if (!smiles) {
      this.toast.trigger('La molecola è vuota!', 'error')
      return
    }
    this.saveContext.setSmiles(smiles)
    this.saveContext.setMode(this.mode())
    this.saveContext.open()
  }

  doSaveEdit(smiles: string): void {
    // salva su api, ecc.
    // ...
  }

  onReset(): void {
    this.triggerReset.set(true)
  }

}
