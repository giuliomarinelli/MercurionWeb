import { Component, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service';
import { catchError, debounce, distinctUntilChanged, filter, firstValueFrom, interval, map, of, Subscription, switchMap, tap } from 'rxjs';
import { MoleculeCardItemModel, MoleculeCollection } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { MyMoleculesHeadingComponent } from '../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { MoleculeCollectionItemCardComponent } from '../../components/molecule-detail/molecule-collection-item-card/molecule-collection-item-card.component';
import { SkeletonMoleculeCardComponent } from '../../components/molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component';
import { ActivatedRoute } from '@angular/router';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { MoleculeDetail } from '../../Models/graphql/molecule.detail.models';
import { MoleculeProperties } from '../../Models/graphql/molecule-properties.interface';
import { LinkModel } from '../../Models/link.model';
import { HistoryContextService } from '../../services/context/history-context.service';




@Component({
  selector: 'app-molecule-collection-detail',
  imports: [
    MyMoleculesHeadingComponent,
    ClassicSpinnerComponent,
    MoleculeCollectionItemCardComponent,
    SkeletonMoleculeCardComponent
  ],
  template: `

    <section class="max-w-5xl mx-auto p-0 xs:p-4 sm:p-6 md:p-8 space-y-12">
    <app-my-molecules-heading [breadcrumb]="breadcrumb" />
    <h2 class="bg-slate-50 dark:bg-neutral-950 z-10 block sticky top-0 text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary pb-8 pt-2" style="margin-block-start: 0">
        {{name()}}
    </h2>
    <div class="mt-px relative bottom-10">
      @for (item of items; track item; let i = $index) {
        <app-molecule-collection-item-card [molecule]="item" [i]="i" [collectionId]="colId()" />
      }
    </div>
    <div #sentinel class="sentinel"></div>
    @if (loading) {
      @if (page > 1 && items.length > 2) {
        <div class="flex justify-center">
          <app-classic-spinner [size]="60" />
        </div>
      } @else {
        @for (i of [0, 1, 2, 3, 4]; track i) {
          <app-skeleton-molecule-card />
        }
      }
    }
  </section>

  `
})
export class MoleculeCollectionDetailPageComponent implements OnInit, OnDestroy {

  // ======================= DEPS =======================
  private readonly moleculeCollectionService = inject(MoleculeCollectionService)
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService)
  private readonly route = inject(ActivatedRoute)
  private readonly historyContext = inject(HistoryContextService)
  // ====================================================

  @ViewChild('sentinel', { static: true })
  sentinel!: ElementRef;

  protected readonly breadcrumb: LinkModel[] = [
    {
      label: 'Collezioni Molecolari',
      path: '/molecules/collections'
    }
  ]

  private colIdSub?: Subscription
  private touchSub?: Subscription
  items: MoleculeCardItemModel[] = []
  title = ''
  loading = true
  done = false
  private observer?: IntersectionObserver
  protected page = 1
  error = signal<boolean>(false)
  name = signal<string>('')
  colId = signal<string>('')

  private fetchPage$(page = this.page, size = 7) {
    const id = this.colId();
    return this.moleculeCollectionItemService.getPaginatedItemsForCollection(id, page, size).pipe(
      debounce(() => interval(80)),
      map(page => ({
        ...page,
        items: page.items.map(mol => ({
          id: mol.id,
          type: mol.type as 'chembl' | 'custom',
          name: mol.type === 'chembl' ? (mol.chemblDetails as MoleculeDetail)?.preferredName ?? '' : mol.name ?? '',
          syn: mol.type === 'chembl' ? (mol.chemblDetails as MoleculeDetail)?.synonyms?.[0] ?? '' : '',
          mwFreebase: mol.type === 'chembl'
            ? (mol.chemblDetails as MoleculeDetail)?.properties.mwFreebase ?? 0
            : (() => { try { return (JSON.parse(mol.propertiesJson ?? '') as MoleculeProperties).mwFreebase ?? 0 } catch { return 0 } })(),
          maxPhase: mol.type === 'chembl' ? (mol.chemblDetails as MoleculeDetail)?.maxPhase ?? 0 : undefined,
          smiles: mol.type === 'chembl' ? (mol.chemblDetails as MoleculeDetail)?.canonicalSmiles ?? '' : mol.canonicalSmiles ?? '',
          createdAt: Date.parse(String(mol.createdAt)),
          updatedAt: Date.parse(String(mol.updatedAt)),
          touchedAt: Date.parse(String(mol.touchedAt))
        }))
      }))
    );
  }


  private startObserver() {
    if (this.observer) this.observer.disconnect();
    this.observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry.isIntersecting) this.loadMore();
      },
      { root: null, rootMargin: '0px 0px 500px 0px', threshold: 0 }
    );
    this.observer.observe(this.sentinel.nativeElement);
  }

  ngOnInit(): void {
    this.touchSub = this.route.paramMap.pipe(
      map(pm => pm.get('colId') ?? ''),
      filter(id => id.length > 0),
      distinctUntilChanged(),
      switchMap(id => this.moleculeCollectionService.markMoleculeCollectionAsTouched(id)),
      switchMap(res => {
        if (res) {
          return this.historyContext.pollNewItem()
        }
        return of(null)
      })
    ).subscribe(() => {/* pass */ })
    this.colIdSub = this.route.paramMap.pipe(
      map(pm => pm.get('colId') ?? ''),
      filter(id => id.length > 0),
      distinctUntilChanged(),
      switchMap(id => this.moleculeCollectionService.getCollectionById(id)),
      tap(col => {
        if (!col) {
          this.error.set(true)
          return
        }
        this.colId.set(col.id)
        this.name.set(col.name)
        this.items = []
        this.page = 1
        this.done = false
        this.loading = false
      }),
      // carica la prima pagina *prima* di avviare l’osservatore
      switchMap(() => this.fetchPage$()),
      catchError(() => {
        this.error.set(true)
        return of(null)
      })
    ).subscribe(page => {
      if (!page) return;
      this.items = page.items;
      this.page = 2;
      this.startObserver();
    });
  }


  ngOnDestroy(): void {
    this.colIdSub?.unsubscribe()
    this.touchSub?.unsubscribe()
  }

  async loadMore() {
    if (this.loading || this.done) return;

    const id = this.colId();
    if (!id) return; // ← guardia fondamentale

    this.loading = true;

    const newPage = await firstValueFrom(this.fetchPage$(this.page, 7));
    if (!newPage || newPage.items.length === 0) {
      this.done = true;
    } else {
      this.items = [...this.items, ...newPage.items];
      this.page++;
    }
    this.loading = false;
  }


}
