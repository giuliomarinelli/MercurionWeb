import { ViewportRuntimeService } from '../../../services/context/viewport-runtime.service';
import { BindCollectionsToMoleculeContextService } from './../../../services/context/action-context/bind-collections-to-molecule-context.service';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild
} from '@angular/core';
import { PaginationController } from '../../../services/pagination/pagination-controller';
import { UiMoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { debounceTime, map, Subscription } from 'rxjs';
import { ProgressIndicatorComponent } from '../../common/progress-indicator/progress-indicator.component';
import { PmSearchInputComponent } from '../../common/pm-search-input/pm-search-input.component';
import { Router } from '@angular/router';
import { ActionCardComponent } from '../../common/action-card/action-card.component';
import { DomainInvalidationService } from '../../../services/domain-invalidation.service';
import { ActionFooterComponent } from '../../common/action-footer/action-footer.component';
import { ButtonComponent } from '../../common/button/button.component';
import { CollectionPickerFacade } from '../collection-picker/collection-picker.facade';
import { AbstractMultiselectItem } from '../../../Models/abstract.models';
import { SelectionControlComponent } from '../../common/selection-control/selection-control.component';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'm-bind-collections-to-molecule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ProgressIndicatorComponent,
    PmSearchInputComponent,
    ActionCardComponent,
    ActionFooterComponent,
    ButtonComponent,
    SelectionControlComponent
  ],
  styleUrl: '../collection-picker/collection-action.css',
  template: `
    <div class="flex justify-center items-start md:items-center px-2 sm:px-4 m-overlay-screen">
      <m-action-card size="standard" labelledBy="bindCollectionsHeading"
        closeLabel="Chiudi pannello collega collezioni" [busy]="pending()"
        [closeDisabled]="pending()" (closed)="close()">
        <h2 action-card-title id="bindCollectionsHeading" class="text-lg font-semibold">Aggiungi alle collezioni</h2>
        <div action-card-body #scrollRoot class="collection-action-body">
          <div class="bind-molecule"><span class="collection-action-eyebrow">Molecola da aggiungere</span><strong>{{ moleculeName() || 'Molecola selezionata' }}</strong></div>
          <p class="collection-action-intro">Scegli una o più destinazioni. Le collezioni che contengono già questa molecola sono escluse dall’elenco.</p>
          <m-search-input [value]="searchTerm()" placeholder="Cerca una collezione…"
            [disabled]="pending()" (valueChange)="doQuery($event)" (submitted)="doQuery($event)" (cleared)="doClear()" />
          <div class="bind-toolbar">
            @if (multiselectItems().length) {
              <m-selection-control label="Seleziona tutte le collezioni disponibili"
                ariaLabel="Seleziona tutte le collezioni"
                description="Include anche le collezioni fuori dai risultati di ricerca."
                [checked]="isSelectedAll()" [indeterminate]="isPartiallySelected()"
                [disabled]="pending()" (changed)="onSelectAllChange($event)" />
            }
            @if (!isSelectedNothing()) {
              <button type="button" class="bind-reset" [disabled]="pending()" (click)="onSelectAllChange(false)">Azzera selezione</button>
            }
          </div>
          <div class="bind-results" role="group" aria-label="Collezioni disponibili">
            @for (row of multiselectItems(); track row.item.id) {
              <m-selection-control class="bind-row" layout="card"
                [class.bind-row-selected]="row.isChecked()"
                [label]="row.item.name" [ariaLabel]="'Seleziona collezione ' + row.item.name"
                [description]="row.item.itemsCount + (row.item.itemsCount === 1 ? ' molecola' : ' molecole')"
                [checked]="row.isChecked()" [disabled]="pending()"
                (changed)="row.isChecked.set($event); toggleOne(row)" />
            }
          </div>
          <div #sentinel class="h-1 w-full"></div>
          @if (loading) {
            <div class="bind-state" role="status"><m-progress-indicator /><p>Caricamento collezioni…</p></div>
          } @else if (paginationState().error) {
            <div class="collection-action-error" role="alert"><p>Non è stato possibile caricare le collezioni.</p><m-button variant="outline" (click)="retryPagination()">Riprova caricamento</m-button></div>
          } @else if (empty() && (earlyDone || done)) {
            <div class="bind-state" role="status">{{ searchTerm() ? 'Nessuna collezione corrisponde alla ricerca. Le selezioni precedenti sono conservate.' : 'Non ci sono altre collezioni disponibili per questa molecola.' }}</div>
          }
          @if (error()) {
            <div class="collection-action-error" role="alert"><p>Non è stato possibile aggiungere la molecola. Le selezioni sono conservate: puoi riprovare.</p></div>
          }
          <div class="bind-selection" role="status">{{ pending() ? 'Associazione in corso…' : selectionSummary() }}</div>
        </div>
        <m-action-footer action-card-footer>
          <m-button action-footer-secondary variant="outline" [disabled]="pending()" (click)="close()">Annulla</m-button>
          <m-button action-footer-primary [disabled]="isSelectedNothing()" [loading]="pending()"
            ariaLabel="Aggiungi la molecola alle collezioni selezionate" (click)="doSubmit()">{{ error() ? 'Riprova associazione' : 'Aggiungi alle collezioni' }}</m-button>
        </m-action-footer>
      </m-action-card>
    </div>
  `
})
export class BindCollectionsToMoleculeComponent implements OnInit, AfterViewInit, OnDestroy {

  private readonly destroyRef = inject(DestroyRef);

  private readonly actionOverlayContext = inject(ActionOverlayContextService);
  private readonly bindContext = inject(BindCollectionsToMoleculeContextService);
  private readonly invalidation = inject(DomainInvalidationService);
  private readonly moleculeCollectionService = inject(MoleculeCollectionService);
  private readonly picker = new CollectionPickerFacade({
    mode: { kind: 'multi', operation: 'bind', moleculeId: this.bindContext.moleculeId() ?? '' },
    pageSize: 20
  });
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService)

  private readonly sessionId = this.actionOverlayContext.session('BindCollectionsToMolecule')?.id ?? -1;
  private readonly pagination = new PaginationController<UiMoleculeCollection>({
    fetch: page => this.picker.fetchPage$(page, this.searchTerm()).pipe(
      debounceTime(100),
      map(result => ({
        ...result, items: result.items.map(item => ({
          ...item,
          triggerDisappear: signal(false),
          collapse: signal(false)
        }))
      }))
    )
  })
  private observer?: IntersectionObserver

  private suSub?: Subscription

  pending = signal<boolean>(false);
  error = signal<boolean>(false);

  protected readonly root = viewChild<ElementRef<HTMLDivElement>>('scrollRoot');
  protected readonly sentinel = viewChild<ElementRef<HTMLDivElement>>('sentinel');
  readonly multiselectItems = signal<AbstractMultiselectItem<UiMoleculeCollection>[]>([]);
  readonly selectedIdSet = signal<Set<string>>(new Set());
  readonly excludedIdSet = signal<Set<string>>(new Set());
  readonly bulkIntent = signal<'none' | 'all' | 'unselect'>('none');
  readonly selectionSnapshotAt = signal<string | null>(null);
  readonly isSelectedAll = computed(() => this.bulkIntent() === 'all' && this.excludedIdSet().size === 0);
  readonly isSelectedNothing = computed(() => this.bulkIntent() !== 'all' && this.selectedIdSet().size === 0);
  readonly isPartiallySelected = computed(() => {
    return this.bulkIntent() === 'all' ? this.excludedIdSet().size > 0 : this.selectedIdSet().size > 0;
  });
  readonly selectionSummary = computed(() => {
    if (this.bulkIntent() === 'all') return this.excludedIdSet().size
      ? 'Tutte le collezioni disponibili, escluse ' + this.excludedIdSet().size + '.'
      : 'Tutte le collezioni disponibili selezionate.';
    const count = this.selectedIdSet().size;
    return count === 0 ? 'Nessuna collezione selezionata.' : count === 1 ? '1 collezione selezionata.' : count + ' collezioni selezionate.';
  });
  readonly moleculeName = this.bindContext.moleculeName
  get items(): UiMoleculeCollection[] { return this.pagination.items() }
  get loading(): boolean { return this.pagination.loading() }
  get done(): boolean { return this.pagination.done() }
  get earlyDone(): boolean { return this.pagination.earlyDone() }
  get page(): number { return this.pagination.page() }
  get empty(): ReturnType<typeof signal<boolean>> { return this.pagination.empty }
  get searchTerm(): ReturnType<typeof signal<string>> { return this.pagination.query }

  ngOnInit(): void {
    queueMicrotask(() => {
      void this.loadMore()
    })
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.startObserver());
  }

  ngOnDestroy(): void {
    this.suSub?.unsubscribe();
    this.observer?.disconnect();
    this.pagination.dispose();
    this.picker.destroy();
  }

  protected readonly viewport = inject(ViewportRuntimeService);
  private readonly rearmObserver = effect(() => {
    this.viewport.visualWidth();
    this.viewport.overlayCompact();
    if (!this.pending()) {
      queueMicrotask(() => this.startObserver());
    } else {
      this.observer?.disconnect();
    }
  });

  loadMore(): Promise<void> {
    return this.pagination.loadMore().then(() => {
      if (this.destroyRef.destroyed) return;
      this.loadRows();
    });
  }
  private readonly syncLoadedRows = effect(() => {
    this.pagination.items();
    queueMicrotask(() => {
      if (!this.destroyRef.destroyed) this.loadRows();
    });
  });
  private loadRows(): void {
    const existing = new Map(this.multiselectItems().map(row => [row.item.id, row]));
    this.multiselectItems.set(this.items.map(item => existing.get(item.id) ?? {
      item,
      isChecked: signal(this.bulkIntent() === 'all' ? !this.excludedIdSet().has(item.id) : this.selectedIdSet().has(item.id))
    }));
  }
  retryPagination(): void { this.pagination.retry(); }
  resetPagination(): void { this.pagination.reset(); this.multiselectItems.set([]); }
  doQuery(q: string): void { if (this.pending()) return; this.pagination.setQuery(q); this.multiselectItems.set([]); }
  doClear(): void { if (this.pending()) return; this.pagination.clear(); this.multiselectItems.set([]); }
  paginationState() { return this.pagination.paginationState(); }
  private startObserver(): void {
    if (this.destroyRef.destroyed || this.pending()) return;
    const sentinel = this.sentinel()?.nativeElement;
    if (!sentinel) return;
    this.observer?.disconnect();
    this.observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && !this.pending()) void this.loadMore();
    }, { root: this.viewport.state().visualWidth < 768 || this.viewport.overlayCompact()
      ? this.root()?.nativeElement.closest('.m-action-card') ?? null : this.root()?.nativeElement.closest('.m-action-card__body') ?? null,
      rootMargin: '0px 0px 500px 0px' });
    this.observer.observe(sentinel);
  }
  toggleOne(row: AbstractMultiselectItem<UiMoleculeCollection>): void {
    if (this.pending()) return;
    this.error.set(false);
    const next = new Set(this.bulkIntent() === 'all' ? this.excludedIdSet() : this.selectedIdSet());
    if (this.bulkIntent() === 'all') {
      row.isChecked() ? next.delete(row.item.id) : next.add(row.item.id);
      this.excludedIdSet.set(next);
    } else {
      row.isChecked() ? next.add(row.item.id) : next.delete(row.item.id);
      this.selectedIdSet.set(next);
      this.bulkIntent.set('none');
    }
  }
  onSelectAllChange(checked: boolean): void {
    if (this.pending()) return;
    this.error.set(false);
    if (checked) {
      this.bulkIntent.set('all');
      this.excludedIdSet.set(new Set());
      this.selectionSnapshotAt.set(String(Date.now()));
    } else {
      this.bulkIntent.set('unselect');
      this.selectedIdSet.set(new Set());
      this.excludedIdSet.set(new Set());
      this.selectionSnapshotAt.set(null);
    }
    this.multiselectItems().forEach(row => row.isChecked.set(checked));
  }

  close(): void {
    if (!this.pending()) this.actionOverlayContext.close(this.sessionId);
  }

  doSubmit(): void {
    if (this.pending() || this.isSelectedNothing()) return;
    const moleculeId = this.bindContext.moleculeId();
    if (!moleculeId) { this.error.set(true); return; }
    this.error.set(false);
    this.pending.set(true);
    this.actionOverlayContext.beginSubmit(this.sessionId);
    const selectAll = this.bulkIntent() === 'all';
    const collectionIds = Array.from(selectAll ? this.excludedIdSet() : this.selectedIdSet());
    this.suSub = this.moleculeCollectionService.bindManyCollectionsToMolecule(
      moleculeId, collectionIds, selectAll, this.selectionSnapshotAt()
    ).subscribe({
      next: ({ ok, moleculeUUID }) => {
        this.pending.set(false);
        if (!ok) {
          this.actionOverlayContext.submitFailed(this.sessionId);
          this.error.set(true);
          return;
        }
        this.actionOverlayContext.submitSucceeded(this.sessionId);
        this.invalidation.publish({ domain: 'molecule', action: 'collections-bound', moleculeId });
        this.toast.trigger('La molecola è stata aggiunta alle collezioni selezionate.', 'success');
        queueMicrotask(() => {
          if (this.destroyRef.destroyed) return;
          this.actionOverlayContext.close(this.sessionId);
          if (moleculeUUID) void this.router.navigateByUrl('/molecules/detail/' + moleculeUUID);
        });
      },
      error: () => {
        this.pending.set(false);
        this.error.set(true);
        this.actionOverlayContext.submitFailed(this.sessionId);
      }
    });
  }
}
