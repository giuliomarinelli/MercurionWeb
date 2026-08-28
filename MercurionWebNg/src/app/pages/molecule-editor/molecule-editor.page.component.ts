import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Subject,
  Subscription,
  EMPTY,
  catchError,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  of,
  switchMap,
  takeUntil,
  map,
  auditTime,
  take,
  combineLatest,
} from 'rxjs';

import { KetcherFrameComponent, KetcherFrameMode } from '../../components/chem/ketcher-frame/ketcher-frame.component';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service';
import { CustomMoleculeCollectionItemSaveContextService } from '../../services/context/action-context/custom-molecule-collection-item-save-context.service';
import { ToastService } from '../../services/toast.service';
import { RdKitApiService } from '../../services/rd-kit-api.service';

@Component({
  selector: 'm-molecule-editor',
  imports: [KetcherFrameComponent],
  template: `
    <main class="mt-2 mb-6" role="main" aria-live="polite" [attr.aria-busy]="pendingAction() !== null">
      <h2
        class="text-center text-light-accent-primary-hc dark:text-dark-accent-primary font-semibold text-xl 2xs:text-2xl sm:text-4xl mb-6"
      >
        @switch (mode()) {
          @case ('create') { Crea una nuova molecola }
          @case ('edit') { Modifica una molecola }
          @case ('duplicate') { Crea molecola da struttura (Duplica) }
        }
      </h2>

    @if (!error()) {
      <m-ketcher-frame
        [smiles]="smiles()"
        [mode]="mode()"
        [triggerReset]="triggerReset()"
        [triggerGetSmiles]="triggerGetSmiles()"
        (exportSmiles)="onSmilesExported($event)"
        (exportPolledSmiles)="onSmilesPollExported($event)"
        (onReset)="handleReset()"
      >
        <div class="flex flex-col 2xs:flex-row gap-3 mt-5 justify-end max-w-2xl mx-auto">
          <button
            class="relative bottom-[2px] w-full mt-4 py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary-hq dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary-hc dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary-hq/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary-hq/60 disabled:hover:dark:bg-dark-accent-primary/80"
            (click)="onReset()"
            [disabled]="untouched()"
            [attr.aria-disabled]="untouched()"
            aria-label="Resetta la struttura"
          >
            Resetta
          </button>

          @if (mode() === 'edit') {
            <button
              [disabled]="lock()"
              class="relative bottom-[2px] w-full mt-4 py-2 bg-emerald-600 text-white rounded-md font-semibold shadow hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors duration-150"
              (click)="onSave()"
              [attr.aria-disabled]="lock()"
              aria-label="Salva molecola"
            >
              Salva
            </button>
          } @else {
            <button
              [disabled]="lock()"
              class="relative bottom-[2px] w-full mt-4 py-2 bg-emerald-600 text-white rounded-md font-semibold shadow hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors duration-150"
              (click)="onSaveAsNew()"
              [attr.aria-disabled]="lock()"
              aria-label="Salva come nuova molecola"
            >
              Salva
            </button>
          }
        </div>
      </m-ketcher-frame>
    } @else {
      <h3 class="text-center text-5xl font-semibold text-light-error dark:text-dark-error" role="alert" aria-live="assertive">
        Si è verificato un errore
      </h3>
    }
    </main>
  `,
})
export class MoleculeEditorPageComponent implements OnInit, OnDestroy {
  // deps
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService);
  private readonly overlayContext = inject(ActionOverlayContextService);
  private readonly saveContext = inject(CustomMoleculeCollectionItemSaveContextService);
  private readonly toast = inject(ToastService);
  private readonly RDKitAPI = inject(RdKitApiService);

  // subscriptions
  private routeSub?: Subscription;
  private smilesByIdSub?: Subscription;
  private molEdSub?: Subscription;
  private molDupSub?: Subscription;

  private readonly destroy$ = new Subject<void>();
  private readonly polledSmiles$ = new Subject<string>();

  // state
  mode = signal<KetcherFrameMode>('edit');
  smiles = signal<string>('');
  mId = signal<string | undefined>(undefined);
  error = signal<boolean>(false);
  triggerReset = signal<boolean>(false);
  triggerGetSmiles = signal<boolean>(false);
  pendingAction = signal<'save' | 'saveNew' | null>(null);
  lock = signal<boolean>(true);
  untouched = signal<boolean>(true);
  private firstCheck = signal<boolean>(false);

  // UI actions
  onSave(): void {
    this.pendingAction.set('save');
    this.triggerGetSmiles.set(true);
  }

  onSaveAsNew(): void {
    this.pendingAction.set('saveNew');
    this.triggerGetSmiles.set(true);
  }

  onReset(): void {
    this.triggerReset.set(true);
  }

  // SMILES polling → dup check
  onSmilesPollExported(smiles: string): void {
    this.polledSmiles$.next(smiles);
  }

  // reset completato dal frame
  handleReset(): void {
    this.triggerReset.set(false);

    // torniamo allo "stato base": nessuna modifica rispetto alla struttura iniziale
    this.untouched.set(true);
    const mode = this.mode();

    if (mode === 'edit' || mode === 'duplicate') {
      // in edit/duplicate: baseline è una struttura reale
      // → blocchiamo il salvataggio finché non c'è una nuova struttura valida
      this.lock.set(true);
      this.firstCheck.set(false); // la prossima volta che vede la baseline non farà toast
    } else {
      // in create la baseline è vuota → lock rimane true
      this.lock.set(true);
      this.firstCheck.set(true);
    }

    this.toast.trigger('Struttura ripristinata alla versione iniziale.', 'success', 1800);
  }

  // dup-check one-shot (usato solo per il salvataggio esplicito)
  private async checkDupe(smiles: string): Promise<string> {
    const canon = await firstValueFrom(
      this.RDKitAPI.toCanonicalSmiles({ smiles }).pipe(
        catchError(e => {
          console.error('RDKitAPI canonicalizzazione errore', e);
          this.toast.trigger('Errore RDKit API nella canonicalizzazione della struttura della molecola.', 'error', 2500);
          return of('');
        })
      )
    );

    if (!canon || !canon.trim().length) {
      this.toast.trigger('SMILES vuota o non valida', 'error', 2500);
      this.pendingAction.set(null);
      return '';
    }

    const dupeRes = await firstValueFrom(
      this.moleculeCollectionItemService
        .findOneCustomMoleculeByCanonicalSmiles_shortFetch(canon)
        .pipe(
          catchError(e => {
            console.error('Errore dup-check salvataggio', e);
            return of(null);
          })
        )
    );

    if (dupeRes) {
      queueMicrotask(() => {
        this.lock.set(true);
        this.toast.trigger(
          `Questa struttura è già associata alla molecola '${dupeRes.name}'. Impossibile salvare una struttura duplicata`,
          'error'
        );
      });
      return '';
    }

    return canon;
  }

  // SMILES richieste esplicitamente per il salvataggio
  async onSmilesExported(smiles: string): Promise<void> {
    this.triggerGetSmiles.set(false);

    const canon = await this.checkDupe(smiles);
    if (!canon) {
      this.pendingAction.set(null);
      return;
    }

    const action = this.pendingAction();

    if (action === 'saveNew') {
      this.doSaveNew(canon);
    } else if (action === 'save') {
      await this.doSaveEdit(canon);
    }

    this.pendingAction.set(null);
  }

  // salvataggio come nuova molecola
  doSaveNew(smiles: string): void {
    if (!smiles) {
      this.toast.trigger('La molecola è vuota!', 'error');
      return;
    }

    this.saveContext.setSmiles(smiles);
    this.saveContext.setMode(this.mode());
    this.saveContext.reset();
    this.overlayContext.open('MoleculeCollectionItemSave');
  }

  // salvataggio in edit
  async doSaveEdit(smiles: string): Promise<void> {
    const props = await firstValueFrom(
      this.RDKitAPI.getMoleculeProperties({ smiles }).pipe(
        catchError(e => {
          console.error('RDKitAPI props error', e);
          this.toast.trigger('Errore RDKit API nelle proprietà', 'error', 2500);
          return of(null);
        })
      )
    );

    this.molEdSub = this.moleculeCollectionItemService
      .updateItemCanonicalSmiles(
        this.mId()!,
        smiles,
        'custom',
        JSON.stringify(props ?? {})
      )
      .subscribe({
        next: res => {
          this.toast.trigger('Struttura modificata correttamente.', 'success', 2000);
          this.router.navigateByUrl(`/molecules/detail/${res!.id}`);
        },
        error: () => this.toast.trigger('Si è verificato un errore.', 'error', 2000),
      });
  }

  // lifecycle
  ngOnInit(): void {
    // routing / init
    this.routeSub = this.route.queryParams.subscribe(qp => {
      const mode = qp['mode'] as KetcherFrameMode;
      const mId = qp['m_id'] as string | undefined;
      const smiles = qp['smiles'] as string | undefined;

      if (!['edit', 'create', 'duplicate'].includes(mode)) {
        this.error.set(true);
        return;
      }

      if (mode === 'edit' && mId) {
        this.mode.set('edit');
        this.lock.set(true);
        this.untouched.set(true);
        this.firstCheck.set(false);

        this.smilesByIdSub = of(null)
          .pipe(
            switchMap(() => this.moleculeCollectionItemService.getCustomSmilesById(mId)),
            switchMap(mol =>
              combineLatest([
                of(mol),
                this.RDKitAPI.toCanonicalSmiles({ smiles: mol!.canonicalSmiles }).pipe(
                  catchError(e => {
                    console.error('RDKitAPI canonicalizzazione init error', e);
                    return of(mol!.canonicalSmiles);
                  })
                ),
              ])
            )
          )
          .subscribe({
            next: ([mol, canon]) => {
              if (!mol) {
                this.error.set(true);
                return;
              }
              this.smiles.set(canon);
              this.mId.set(mId);
            },
            error: () => this.error.set(true),
          });
      } else if (mode === 'duplicate' && smiles) {
        this.mode.set('duplicate');
        this.smiles.set(smiles);
        this.lock.set(true);
        this.untouched.set(true);
        this.firstCheck.set(false);
      } else if (mode === 'create') {
        this.mode.set('create');
        this.smiles.set('');
        this.lock.set(true);
        this.untouched.set(true);
        this.firstCheck.set(true);
      } else {
        this.error.set(true);
      }
    });

    // dup-check stream (no HTTP raffiche, dedup su SMILES + canon)
    this.molDupSub = this.polledSmiles$
      .pipe(
        takeUntil(this.destroy$),

        map(s => s.trim()),
        filter(Boolean),

        distinctUntilChanged(),

        auditTime(0),

        switchMap(raw =>
          this.RDKitAPI.toCanonicalSmiles({ smiles: raw }).pipe(
            catchError(e => {
              console.error('RDKitAPI canonical poll error', e);
              return EMPTY;
            })
          )
        ),

        filter(Boolean),

        distinctUntilChanged(),

        switchMap((canon: string) =>
          this.moleculeCollectionItemService
            .findOneCustomMoleculeByCanonicalSmiles_shortFetch(canon)
            .pipe(
              take(1),
              map(res => ({ canon, res })),
              catchError(e => {
                console.error('Dup check stream error', e);
                return of({ canon, res: null as any });
              })
            )
        )
      )
      .subscribe({
        next: ({ res, canon }: { res: any; canon: string }) => {
          const mode = this.mode();
          const isBaselineMode = mode === 'edit' || mode === 'duplicate';

          if (res) {
            // baseline dup in edit/duplicate → lo usiamo solo per fissare lo stato, niente toast
            if (isBaselineMode && !this.firstCheck()) {
              this.firstCheck.set(true);
              this.lock.set(true);
              this.untouched.set(true);
              return;
            }

            queueMicrotask(() => {
              this.lock.set(true);
              this.untouched.set(false);
              this.toast.trigger(
                `Questa struttura è già associata alla molecola '${res.name}'. Impossibile salvare una struttura duplicata`,
                'error'
              );
            });
            return;
          }

          // nessun duplicato → struttura valida
          this.lock.set(false);
          this.untouched.set(false);

          if (isBaselineMode && !this.firstCheck()) {
            this.firstCheck.set(true);
          }
        },
        error: () =>
          queueMicrotask(() =>
            this.toast.trigger(
              `Errore nella validazione unicità struttura. Se si ripresenta, contatta il supporto.`,
              'error'
            )
          ),
      });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.smilesByIdSub?.unsubscribe();
    this.molEdSub?.unsubscribe();
    this.molDupSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
