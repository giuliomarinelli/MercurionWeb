import { MoleculeCardItemModel } from './../../Models/graphql/molecule-collection/molecule-collection.types';
import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { MoleculeCollectionItemCardComponent } from '../../components/molecule-detail/molecule-collection-item-card/molecule-collection-item-card.component';
import { debounceTime, map, Subscription } from 'rxjs';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { Helpers } from '../../helpers';
import { SkeletonMoleculeCardComponent } from '../../components/molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component';
import { MyMoleculesHeadingComponent } from '../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component';
import { RouterLink } from '@angular/router';
import { HistoryContextService } from '../../services/context/history-context.service';
import { ToastService } from '../../services/toast.service';
import { AbstractPaginationComponent } from '../../abstract/abstract-pagination-component';
import { PmSearchInputComponent } from '../../components/common/pm-search-input/pm-search-input.component';

@Component({
  selector: 'app-all-my-molecules.page',
  imports: [
    ClassicSpinnerComponent,
    MoleculeCollectionItemCardComponent,
    SkeletonMoleculeCardComponent,
    MyMoleculesHeadingComponent,
    RouterLink,
    PmSearchInputComponent
  ],
  template: `

    <section class="max-w-5xl mx-auto p-0 xs:p-4 sm:p-6 md:p-8 space-y-12">
      <app-my-molecules-heading />
      <div class="flex flex-wrap gap-y-4 justify-between items-center relative -top-12 pt-2">
        <h2 class="bg-slate-50 dark:bg-neutral-950 z-10 block sticky top-0 bottom-5 text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary" style="margin-block-start: 0">
            Tutte le mie molecole
        </h2>
        <div class="flex items-center gap-3">
          <!-- 🧩 Aggiungi nuove molecole -->
          <button
            type="button"
            class="flex items-center gap-2 relative px-3 py-1 rounded-md border border-slate-300 dark:border-slate-600
                   text-slate-600 dark:text-slate-300 text-xs font-medium
                   hover:bg-slate-200 dark:hover:bg-slate-700
                   transition-colors duration-150"
            title="Aggiungi nuove molecole alla collezione"
            (click)="doAddMolecules()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto">
              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path d="M336 112L336 96L304 96L304 304L96 304L96 336L304 336L304 544L336 544L336 336L544 336L544 304L336 304L336 112z"/>
            </svg>
            <span>Aggiungi nuove molecole</span>
          </button>
        </div>
      </div>
      <pm-search-input
        class="block relative"
        [class.invisible]="empty() && earlyDone"
        [placeholder]="'Cerca collezione...'"
        [value]="searchTerm()"
        (valueChange)="doQuery($event)"
        (submitted)="doQuery($event)"
        (cleared)="doClear()"
      />
      <div class="flex gap-2 items-center flex-wrap relative -top-6">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-8 h-auto relative -top-2">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path d="M296.5 153.7C268.2 123 314.7 79.6 343.4 110.1C395.3 166.7 479.5 256.1 528.4 302C544.6 317.7 544.4 343.6 528.4 359.3C517.9 369.6 499.6 387.7 494.2 394.1C448.6 448.2 388.1 485.8 344.3 536.7C332.8 550.1 312.6 551.7 299.2 540.3C257.6 499.5 349.3 448.3 372.4 421.9C398.9 399.3 423.7 378 444.4 353.8C432 353.5 419.6 353.7 406.7 354C325.8 354.2 244.1 356.1 162.3 355.5C136.2 356.8 94.8 360.6 96 321.8C97.9 289.9 132.6 290.7 157.9 291.6C239.4 292.1 320.7 290.4 403.1 290.1C410 289.9 417.2 289.8 424.8 289.7C376.2 241.2 341.3 201.2 296.4 153.7z"/>
          </svg>
          <a class="a relative -top-2" routerLink="/molecules/collections">Mostra tutte le mie collezioni molecolari</a>
        </div>
      <div class="mt-px relative -top-16">
        @for (item of items; track item; let i = $index) {
          <app-molecule-collection-item-card [molecule]="item" [i]="i" (onDelete)="doDelete($event)" />
        }
      </div>
      <div #sentinel class="sentinel"></div>
      @if (loading) {
        @if (page > 1) {
          <div class="flex justify-center">
            <app-classic-spinner [size]="60" />
          </div>
        } @else {
          <div class="relative -top-16">
            @for (i of [0, 1, 2, 3, 4]; track i) {
              <app-skeleton-molecule-card />
            }
          </div>
        }
      } @else if (empty() && earlyDone) {
        <p class="relative -top-8 text-slate-700 dark:text-slate-200">Nessuna molecola.</p>
      }
    </section>

  `
})
export class AllMyMoleculesPageComponent extends AbstractPaginationComponent<MoleculeCardItemModel> implements OnInit, AfterViewInit, OnDestroy {

  // ======================= DEPS =======================
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService)
  private readonly historyContext = inject(HistoryContextService)
  private readonly toast = inject(ToastService)
  // ====================================================


  @ViewChild('sentinel', { static: true })
  declare sentinel: ElementRef<HTMLDivElement> | undefined


  private delSub?: Subscription


  async ngOnInit(): Promise<void> {
    await this.loadMore()
  }

  ngAfterViewInit(): void {
    this.startObserver()
  }

  ngOnDestroy(): void {
    this.delSub?.unsubscribe()
  }

  protected fetch$(page = this.page, size = 10) {
    return this.moleculeCollectionItemService.getAllPaginatedItems(page, size, this.searchTerm()).pipe(
      debounceTime(200),
      map(page => ({
        ...page,
        items: page.items.map(mol => Helpers.moleculeClientToCardAdapter(mol))
      }))
    );
  }


  doDelete(id: string): void {
    this.delSub = this.moleculeCollectionItemService.deleteItem(id).subscribe({
      next: ok => {
        if (ok) {
          this.historyContext.triggerRemoveItemFromHistoryView(id)
          const i = this.items.findIndex(item => item.id === id)
          if (i !== -1) {
            this.items.splice(i, 1)
          }
        }
      },
      error: () => this.toast.trigger('Si è verificato un errore.', 'error', 2500)
    })
  }

  doAddMolecules(): void {

  }

  protected override doQuery(q: string): void {
    this.query(q)
  }

  protected override doClear(): void {
    this.clear()
  }

}
