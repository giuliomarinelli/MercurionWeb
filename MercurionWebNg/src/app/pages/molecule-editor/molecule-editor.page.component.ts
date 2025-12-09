import { CustomMoleculeCollectionItemSaveContextService } from './../../services/context/action-context/custom-molecule-collection-item-save-context.service';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { KetcherFrameComponent, KetcherFrameMode } from '../../components/chem/ketcher-frame/ketcher-frame.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service';
import { ToastService } from '../../services/toast.service';
import { RDKitService } from '../../services/rd-kit-loader.service';

@Component({
  selector: 'm-molecule-editor',
  imports: [KetcherFrameComponent],
  template: `
    <div class="mt-2 mb-6">
      <h2 class="text-center text-light-accent-primary dark:text-dark-accent-primary font-semibold text-xl 2xs:text-2xl sm:text-4xl">
        @switch (mode()) {
          @case ('create') { Crea una nuova molecola }
          @case ('edit') { Modifica una molecola }
          @case ('duplicate') { Crea molecola da struttura (Duplica) }
        }
      </h2>
    </div>

    @if (!error()) {
      <m-ketcher-frame
        [smiles]="smiles()"
        [mode]="mode()"
        [triggerReset]="triggerReset()"
        [triggerGetSmiles]="triggerGetSmiles()"
        (exportSmiles)="onSmilesExported($event)"
        (exportPolledSmiles)="onSmilesPollExported($event)"
        (onReset)="triggerReset.set(false)"
      >
        <div class="sm:flex flex-col 2xs:flex-row gap-3 mt-5 justify-end max-w-2xl mx-auto hidden">
          <button
            class="relative bottom-[2px] w-full mt-4 py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary/80 dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary/60 disabled:hover:dark:bg-dark-accent-primary/80"
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
      </m-ketcher-frame>
    } @else {
      <h3 class="text-center text-5xl font-semibold text-light-error dark:text-dark-error">Si è verificato un errore</h3>
    }
  `
})
export class MoleculeEditorPageComponent implements OnInit, OnDestroy {

  // ======================= DEPS =======================
  private readonly route = inject(ActivatedRoute);
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService);
  private readonly overlayContext = inject(ActionOverlayContextService);
  private readonly saveContext = inject(CustomMoleculeCollectionItemSaveContextService)
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly RDKit = inject(RDKitService);
  // ====================================================

  private routeSub?: Subscription;
  private smilesByIdSub?: Subscription;
  private molEdSub?: Subscription;

  mode = signal<KetcherFrameMode>('edit');
  smiles = signal<string>('');
  checkSmiles = signal<string>('174dd9b9-661a-4231-b7af-57e0109e2af8')
  mId = signal<string | undefined>(undefined);
  error = signal<boolean>(false);
  triggerReset = signal<boolean>(false);
  triggerGetSmiles = signal<boolean>(false);
  pendingAction = signal<'save' | 'saveNew' | null>(null);

  onSave(): void {
    this.pendingAction.set('save');
    this.triggerGetSmiles.set(true);
  }

  onSaveAsNew(): void {
    this.pendingAction.set('saveNew');
    this.triggerGetSmiles.set(true);
  }

  onSmilesPollExported(e: string): void {
    this.checkSmiles.set(e);
    console.log(e);
    // qui puoi fare il check live di duplicati/collisioni
  }

  // Quando le SMILES sono arrivate su richiesta esplicita (salvataggio)
  onSmilesExported(e: string) {
    this.triggerGetSmiles.set(false);

    if (this.pendingAction() === 'saveNew') {
      this.doSaveNew(e);
    } else if (this.pendingAction() === 'save') {
      this.doSaveEdit(e);
    }
    this.pendingAction.set(null);
  }

  // Esegui qui il vero salvataggio
  doSaveNew(smiles: string): void {
    if (!smiles) {
      this.toast.trigger('La molecola è vuota!', 'error');
      return;
    }
    this.saveContext.setSmiles(smiles)
    this.saveContext.setMode(this.mode())
    this.saveContext.reset()
    this.overlayContext.open('MoleculeCollectionItemSave')
  }

  async doSaveEdit(smiles: string): Promise<void> {
    this.molEdSub = this.moleculeCollectionItemService
      .updateItemCanonicalSmiles(this.mId()!, smiles, 'custom', JSON.stringify(await this.RDKit.getMoleculeProperties(smiles)))
      .subscribe({
        next: res => {
          this.toast.trigger('Struttura modificata correttamente', 'success', 2000);
          this.router.navigateByUrl(`/molecules/detail/${res!.id}`);
        },
        error: () => this.toast.trigger('Si è verificato un errore', 'success', 2000)
      });
  }

  onReset(): void {
    this.triggerReset.set(true);
  }

  ngOnInit(): void {
    this.routeSub = this.route.queryParams.subscribe(qp => {
      const mode = qp['mode'] as KetcherFrameMode;
      if (!['edit', 'create', 'duplicate'].includes(mode)) {
        this.error.set(true);
        return;
      }

      const mId = qp['m_id'];
      if (mode === 'edit' && mId) {
        this.mode.set('edit');
        this.smilesByIdSub = this.moleculeCollectionItemService.getCustomSmilesById(mId).subscribe({
          next: res => {
            if (!res) {
              this.error.set(true);
              return;
            }
            this.smiles.set(res.canonicalSmiles);
            this.mId.set(mId);
          },
          error: () => this.error.set(true)
        });
      } else if (mode === 'duplicate' && qp['smiles']) {
        this.smiles.set(qp['smiles']);
        this.mode.set('duplicate');
      } else if (mode === 'create') {
        this.smiles.set('');
        this.mode.set('create');
      } else {
        this.error.set(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.smilesByIdSub?.unsubscribe();
    this.molEdSub?.unsubscribe();
  }
}
