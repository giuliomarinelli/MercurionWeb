import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import {
  Subject,
  Subscription,
  EMPTY,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  of,
  switchMap,
  takeUntil,
  map,
  exhaustMap,
  take
} from 'rxjs'

import { KetcherFrameComponent, KetcherFrameMode } from '../../components/chem/ketcher-frame/ketcher-frame.component'
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service'
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service'
import { CustomMoleculeCollectionItemSaveContextService } from '../../services/context/action-context/custom-molecule-collection-item-save-context.service'
import { ToastService } from '../../services/toast.service'
import { RdKitApiService } from '../../services/rd-kit-api.service'

@Component({
  selector: 'm-molecule-editor',
  standalone: true,
  imports: [KetcherFrameComponent],
  template: `
    <div class="mt-2 mb-6">
      <h2
        class="text-center text-light-accent-primary dark:text-dark-accent-primary font-semibold text-xl 2xs:text-2xl sm:text-4xl"
      >
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
            (click)="onReset()"
          >
            Resetta
          </button>

          @if (mode() === 'edit') {
            <button
              class="relative bottom-[2px] w-full mt-4 py-2 text-white rounded-md transition-colors duration-150 bg-emerald-600 hover:bg-light-accent-primary/80 dark:hover:bg-emerald-600/90 disabled:bg-light-accent-primary/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary/60 disabled:hover:dark:bg-dark-accent-primary/80"
              (click)="onSave()"
            >
              Salva
            </button>
          } @else {
            <button
              class="relative bottom-[2px] w-full mt-4 py-2 text-white rounded-md transition-colors duration-150 bg-emerald-600 hover:bg-light-accent-primary/80 dark:hover:bg-emerald-600/90 disabled:bg-light-accent-primary/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary/60 disabled:hover:dark:bg-dark-accent-primary/80"
              (click)="onSaveAsNew()"
            >
              Salva
            </button>
          }
        </div>
      </m-ketcher-frame>
    } @else {
      <h3 class="text-center text-5xl font-semibold text-light-error dark:text-dark-error">
        Si è verificato un errore
      </h3>
    }
  `
})
export class MoleculeEditorPageComponent implements OnInit, OnDestroy {
  // deps
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService)
  private readonly overlayContext = inject(ActionOverlayContextService)
  private readonly saveContext = inject(CustomMoleculeCollectionItemSaveContextService)
  private readonly toast = inject(ToastService)
  private readonly RDKitAPI = inject(RdKitApiService)

  // subscriptions
  private routeSub?: Subscription
  private smilesByIdSub?: Subscription
  private molEdSub?: Subscription
  private molDupSub?: Subscription

  private readonly destroy$ = new Subject<void>()
  private readonly polledSmiles$ = new Subject<string>()

  // state
  mode = signal<KetcherFrameMode>('edit')
  smiles = signal<string>('')
  mId = signal<string | undefined>(undefined)
  error = signal<boolean>(false)
  triggerReset = signal<boolean>(false)
  triggerGetSmiles = signal<boolean>(false)
  pendingAction = signal<'save' | 'saveNew' | null>(null)

  // UI actions
  onSave(): void {
    this.pendingAction.set('save')
    this.triggerGetSmiles.set(true)
  }

  onSaveAsNew(): void {
    this.pendingAction.set('saveNew')
    this.triggerGetSmiles.set(true)
  }

  onReset(): void {
    this.triggerReset.set(true)
  }

  // SMILES polling → dup check
  onSmilesPollExported(smiles: string): void {
    this.polledSmiles$.next(smiles)
  }

  // SMILES richieste esplicitamente per il salvataggio
  async onSmilesExported(smiles: string): Promise<void> {
    this.triggerGetSmiles.set(false)

    const canon = await firstValueFrom(
      this.RDKitAPI.toCanonicalSmiles({ smiles }).pipe(
        catchError(e => {
          console.error('RDKitAPI canonical error', e)
          this.toast.trigger('Errore RDKit API nella canonicalizzazione', 'error', 2500)
          return of('')
        })
      )
    )

    if (!canon || !canon.trim().length) {
      this.toast.trigger('SMILES vuota o non valida', 'error', 2500)
      this.pendingAction.set(null)
      return
    }

    const action = this.pendingAction()

    if (action === 'saveNew') {
      this.doSaveNew(canon)
    } else if (action === 'save') {
      await this.doSaveEdit(canon)
    }

    this.pendingAction.set(null)
  }

  // salvataggio come nuova molecola
  doSaveNew(smiles: string): void {
    if (!smiles) {
      this.toast.trigger('La molecola è vuota!', 'error')
      return
    }

    this.saveContext.setSmiles(smiles)
    this.saveContext.setMode(this.mode())
    this.saveContext.reset()
    this.overlayContext.open('MoleculeCollectionItemSave')
  }

  // salvataggio in edit
  async doSaveEdit(smiles: string): Promise<void> {
    const props = await firstValueFrom(
      this.RDKitAPI.getMoleculeProperties({ smiles }).pipe(
        catchError(e => {
          console.error('RDKitAPI props error', e)
          this.toast.trigger('Errore RDKit API nelle proprietà', 'error', 2500)
          return of(null)
        })
      )
    )

    this.molEdSub = this.moleculeCollectionItemService
      .updateItemCanonicalSmiles(
        this.mId()!,
        smiles,
        'custom',
        JSON.stringify(props ?? {})
      )
      .subscribe({
        next: res => {
          this.toast.trigger('Struttura modificata correttamente.', 'success', 2000)
          this.router.navigateByUrl(`/molecules/detail/${res!.id}`)
        },
        error: () => this.toast.trigger('Si è verificato un errore.', 'error', 2000)
      })
  }

  // lifecycle
  ngOnInit(): void {
    // routing / init
    this.routeSub = this.route.queryParams.subscribe(qp => {
      const mode = qp['mode'] as KetcherFrameMode
      const mId = qp['m_id'] as string | undefined
      const smiles = qp['smiles'] as string | undefined

      if (!['edit', 'create', 'duplicate'].includes(mode)) {
        this.error.set(true)
        return
      }

      if (mode === 'edit' && mId) {
        this.mode.set('edit')
        this.smilesByIdSub = this.moleculeCollectionItemService
          .getCustomSmilesById(mId)
          .subscribe({
            next: res => {
              if (!res) {
                this.error.set(true)
                return
              }
              this.smiles.set(res.canonicalSmiles)
              this.mId.set(mId)
            },
            error: () => this.error.set(true)
          })
      } else if (mode === 'duplicate' && smiles) {
        this.mode.set('duplicate')
        this.smiles.set(smiles)
      } else if (mode === 'create') {
        this.mode.set('create')
        this.smiles.set('')
      } else {
        this.error.set(true)
      }
    })

    // dup-check stream (FIX: debounce < poll)
    this.molDupSub = this.polledSmiles$
  .pipe(
    takeUntil(this.destroy$),
    debounceTime(500),
    map(s => s.trim()),
    filter(Boolean),

    switchMap(raw =>
      this.RDKitAPI.toCanonicalSmiles({ smiles: raw }).pipe(
        catchError(e => {
          console.error('RDKitAPI canonical poll error', e)
          return EMPTY
        })
      )
    ),

    filter(Boolean),
    distinctUntilChanged(),

    // QUI cambia tutto
    exhaustMap(canon =>
      this.moleculeCollectionItemService
        .findOneCustomMoleculeByCanonicalSmiles_shortFetch(canon)
        .pipe(
          take(1),
          map(res => ({ canon, res })),
          catchError(e => {
            console.error('Dup check error', e)
            return of({ canon, res: null })
          })
        )
    )
  )
  .subscribe({
    next: ({ canon, res }) => {
      console.log('canon', canon)
      console.log('dup res', !!res)
    },
    error: e => console.error('dup stream error', e)
  })

  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe()
    this.smilesByIdSub?.unsubscribe()
    this.molEdSub?.unsubscribe()
    this.molDupSub?.unsubscribe()

    this.destroy$.next()
    this.destroy$.complete()
  }
}
