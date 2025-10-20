import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  effect,
  NgZone,
} from '@angular/core';
import { HistoryService } from '../../../services/history.service';
import { debounce, distinctUntilChanged, filter, firstValueFrom, interval, Subscription } from 'rxjs';
import { HistoryDTO } from '../../../Models/history.models';
import { NavigationEnd, Router } from '@angular/router';
import { HistoryItemComponent } from '../history-item/history-item.component';
import { ClassicSpinnerComponent } from '../classic-spinner/classic-spinner.component';
import { HistoryContextService } from '../../../services/context/history-context.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [HistoryItemComponent, ClassicSpinnerComponent],
  template: `
    @for (item of items; track item) {
      <app-history-item [historyDTO]="item" class="block" />
    }

    @if (!items.length && !loading) {
      <p class="text-xs opacity-60 px-6 py-4">Nessuna attività recente.</p>
    }

    @if (loading) {
      <div class="flex justify-center pt-8">
        <app-classic-spinner [size]="30" />
      </div>
    }

    <!-- Il sentinel DEVE essere l'ultimo elemento -->
    <div #sentinel id="sentinel" style="height: 1px;"></div>
  `
})
export class HistoryComponent implements OnInit, OnDestroy, AfterViewInit {

  // ======================= DEPS =======================
  private readonly historyService = inject(HistoryService);
  private readonly router = inject(Router);
  private readonly historyContext = inject(HistoryContextService);
  private readonly ngZone = inject(NgZone);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  // ====================================================

  @ViewChild('sentinel', { static: true })
  sentinel!: ElementRef<HTMLElement>;

  private rSub?: Subscription;
  private observer?: IntersectionObserver;
  private rootEl: HTMLElement | null = null;

  items: HistoryDTO[] = [];
  loading = false;
  done = false;
  protected page = 1;

  constructor() {
    // Aggiornamento in testa quando arriva un elemento nuovo dal context
    effect(() => {
      if (this.historyContext.newHistoryItem()) {
        const newItem = this.historyContext.newHistoryItem()!;
        this.historyContext.clearNewHistoryItem();
        const i = this.items.findIndex(item => item.itemId === newItem.itemId);
        if (i !== -1) {
          this.items.splice(i, 1);
        }
        this.items.unshift(newItem);
      }
    });
    effect(() => {
      if (this.historyContext.removeItemTriggerSignal()) {
        const itemId = this.historyContext.removeItemTriggerSignal()
        this.historyContext.clearRemoveItemTriggerSignal()
        const i = this.items.findIndex(item => item.itemId === itemId)
        if (i !== -1) {
          this.items.splice(i, 1)
        }
      }
    })
  }

  ngOnInit(): void {
    // Mantieni il tuo comportamento su NavigationEnd (non lo tolgo)
    this.rSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.page === 1) {
          this.loadMore();
        }
      });
  }

  ngAfterViewInit(): void {
    this.rootEl = this.findScrollContainer();
    this.startObserver();
    // Primo caricamento esplicito: non dipendere dal routing
    if (this.page === 1) {
      this.loadMore();
    }
  }

  ngOnDestroy(): void {
    this.rSub?.unsubscribe();
    if (this.observer) this.observer.disconnect();
  }

  // Trova il vero contenitore scrollabile (la tua sidebar ha .custom-scrollbar)
  private findScrollContainer(): HTMLElement | null {
    let el: HTMLElement | null = this.hostRef.nativeElement;
    while (el && el !== document.body) {
      const style = getComputedStyle(el);
      const isScrollable = style.overflowY === 'auto' || style.overflowY === 'scroll';
      if (el.classList.contains('custom-scrollbar') || isScrollable) {
        return el;
      }
      el = el.parentElement as HTMLElement | null;
    }
    return null; // fallback alla viewport
  }

  private startObserver() {
    if (this.observer) this.observer.disconnect();

    this.observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          // La callback di IO è fuori dallo NgZone: rientro esplicitamente
          this.ngZone.run(() => this.loadMore());
        }
      },
      {
        root: this.rootEl,                // <-- usa il contenitore scrollabile reale
        rootMargin: '0px 0px 300px 0px',  // un piccolo prefetch in anticipo
        threshold: 0
      }
    );

    this.observer.observe(this.sentinel.nativeElement);
  }

  async loadMore() {
    if (this.loading || this.done) return;

    this.loading = true;

    const newPage = await firstValueFrom(
      this.historyService.getHistory(this.page, 15).pipe(
        // lascio la tua logica di debounce/distinct
        debounce(() => interval(80)),
        distinctUntilChanged()
      )
    );

    if (!newPage || !newPage.items || newPage.items.length === 0) {
      this.done = true;
    } else {
      this.items = [...this.items, ...newPage.items];
      this.page++;
    }

    this.loading = false;
  }
}
