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
  signal,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { HistoryService } from '../../../services/history.service';
import { catchError, debounce, distinctUntilChanged, EMPTY, filter, firstValueFrom, interval, Subscription } from 'rxjs';
import { HistoryDTO } from '../../../Models/history.models';
import { NavigationEnd, Router } from '@angular/router';
import { HistoryItemComponent } from '../history-item/history-item.component';
import { ClassicSpinnerComponent } from '../classic-spinner/classic-spinner.component';
import { HistoryContextService } from '../../../services/context/history-context.service';
import { NgClass } from '@angular/common';
import { AppContextService } from '../../../services/context/app-context.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [HistoryItemComponent, ClassicSpinnerComponent, NgClass],
  styles: `
    .fade-out-ani {
          animation: 0.5s ease-in both fade-out;
        }
    @keyframes fade-out {
      from {
        opacity: 1
      }
      to {
        opacity: 0
      }
    }
  `,
  template: `
    @if (items().length) {
      <div [ngClass]="fadeOut()">
        @for (item of items(); track item.id) {
          <app-history-item [historyDTO]="item" class="block" />
        }
      </div>
    }
    @if (!items().length && !loading) {
      <p class="text-xs opacity-60 px-6 py-4">Nessuna attività recente.</p>
    }

    @if (loading) {
      <div class="flex justify-center pt-8">
        <app-classic-spinner [size]="30" />
      </div>
    }

    @if (serverError()) {
      <div class="flex justify-center pt-8 text-sm">
        <p class="text-light-error dark:text-dark-error">Si è verificato un errore.</p>
      </div>
    }

    <!-- Il sentinel DEVE essere l'ultimo elemento -->
    <div #sentinel id="sentinel" style="height: 1px;"></div>
  `
})
export class HistoryComponent implements OnInit, OnDestroy, AfterViewInit {

  // ======================= DEPS =======================
  private readonly historyService = inject(HistoryService)
  private readonly router = inject(Router)
  private readonly historyContext = inject(HistoryContextService)
  private readonly ngZone = inject(NgZone)
  private readonly hostRef = inject(ElementRef<HTMLElement>)
  private readonly appContext = inject(AppContextService)
  // ====================================================

  @ViewChild('sentinel', { static: true })
  sentinel!: ElementRef<HTMLElement>;

  @Input()
  set triggerDelete(triggerDelete: boolean) {
    this._triggerDelete.set(triggerDelete)
  }

  @Input()
  set triggerEmptyCheck(triggerEmptyCheck: boolean) {
    this._triggerEmptyCheck.set(triggerEmptyCheck)
  }

  @Output()
  emptyChange = new EventEmitter<boolean>()

  private rSub?: Subscription
  private observer?: IntersectionObserver
  private rootEl: HTMLElement | null = null

  serverError = signal<boolean>(false)
  _triggerDelete = signal<boolean>(false)
  _triggerEmptyCheck = signal<boolean>(false)
  fadeOut = signal<string>('')

  items = signal<HistoryDTO[]>([])
  loading = false
  done = false
  protected page = 1

  constructor() {
    effect(() => {
      const ni = this.historyContext.newHistoryItem()
      if (ni) {
        // post-render: niente NG0100
        queueMicrotask(() => {
          this.historyContext.clearNewHistoryItem()
          // immutabile: niente splice/unshift
          this.items.update(items => items.filter(it => it.itemId !== ni.itemId))
          const next = [ni, ...this.items()]
          this.items.set(next)
        });
      }
    });

    // remove item
    effect(() => {
      const rmId = this.historyContext.removeItemTriggerSignal()
      if (rmId) {
        queueMicrotask(() => {
          const hostRef = new ElementRef(this.findScrollContainer() ?? document.body)
          this.appContext.scrollToTop(hostRef, 400)
          this.historyContext.clearRemoveItemTriggerSignal()
          this.items.update(items => items.filter(it => it.itemId !== rmId))
        })
      }
    })

    effect(() => {
      if (this._triggerDelete()) {
        queueMicrotask(() => {
          this._triggerDelete.set(false)
          this.fadeOut.set('fade-out-ani')
        })
        setTimeout(() => {
          this.items.set([])
          this.fadeOut.set('')
          this.emptyChange.emit(true)
        }, 600)
      }
    })

    effect(() => {
      const i = this.items()
      if (i.length === 0) {
        this.emptyChange.emit(true)
      } else {
        this.emptyChange.emit(false)
      }
    })

    effect(() => {
      if (this._triggerEmptyCheck()) {
        this._triggerEmptyCheck.set(false)
        this.emptyChange.emit(true)
      }
    })

  }

  ngOnInit(): void {
    // Mantieni il tuo comportamento su NavigationEnd (non lo tolgo)
    this.rSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (this.page === 1) {
          queueMicrotask(() => this.loadMore())
        }
        const rootRef = new ElementRef(this.findScrollContainer() ?? document.body)
        const pathPrefixes = ['/molecules/collections', '/molecules/all-my-molecules', '/molecules/detail']
        let scroll = false
        for (const p of pathPrefixes) {
          if (e.urlAfterRedirects.startsWith(p)) {
            scroll = true
            break
          }
        }
        if (scroll) {
          queueMicrotask(() => this.appContext.scrollToTop(rootRef, 400))
        }
      })
  }

  ngAfterViewInit(): void {
    this.rootEl = this.findScrollContainer()
    this.startObserver()
    // Primo caricamento esplicito: non dipendere dal routing
    if (this.page === 1) {
      queueMicrotask(() => this.loadMore())
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

    this.observer.observe(this.sentinel.nativeElement)
  }

  async loadMore() {
    if (this.loading || this.done) return

    this.loading = true;

    const newPage = await firstValueFrom(
      this.historyService.getHistory(this.page, 15).pipe(
        // lascio la tua logica di debounce/distinct
        debounce(() => interval(80)),
        distinctUntilChanged(),
        catchError(() => {
          this.serverError.set(true)
          this.loading = false
          return EMPTY
        })
      )
    );

    if (!newPage || !newPage.items || newPage.items.length === 0) {
      if (this.items().length === 0) {
        this.emptyChange.emit(true)
      }
      this.done = true
    } else {
      this.emptyChange.emit(false)
      this.items.update(items => [...items, ...newPage.items])
      this.page++
    }

    this.loading = false
  }
}
