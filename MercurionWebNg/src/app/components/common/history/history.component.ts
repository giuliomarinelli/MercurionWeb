import {
  AfterViewInit,
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  effect,
  NgZone,
  signal,
  input,
  output,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HistoryService } from '../../../services/history.service';
import { debounce, distinctUntilChanged, filter, firstValueFrom, interval, Subscription } from 'rxjs';
import { HistoryDTOExt } from '../../../Models/history.models';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { HistoryItemComponent } from '../history-item/history-item.component';
import { ProgressIndicatorComponent } from '../progress-indicator/progress-indicator.component';
import { HistoryContextService } from '../../../services/context/history-context.service';
import { NgClass } from '@angular/common';
import { ScrollContextService } from '../../../services/context/scroll-context.service';
import { DomainInvalidationService } from '../../../services/domain-invalidation.service';
import { RealtimeSyncStatusService } from '../../../services/realtime-sync-status.service';
import { routeManifest } from '../../../route-manifest';

@Component({
  selector: 'm-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HistoryItemComponent, ProgressIndicatorComponent, NgClass],
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
      <div [ngClass]="fadeOut()" class="pb-36 sm:pb-4 lg:pb-0">
        @for (item of items(); track item.id) {
          <m-history-item
            [historyDTO]="item"
            [selected]="item.selected()"
            class="block"
            (itemClick)="handleItemClick()" />
        }
      </div>
    }
    @if (!items().length && !loading) {
      <p class="text-xs opacity-60 px-6 py-4">Nessuna attività recente.</p>
    }

    @if (loading) {
      <div class="flex justify-center pt-8">
        <m-progress-indicator />
      </div>
    }

    @if (serverError()) {
      <div class="flex flex-col items-center gap-2 pt-8 text-sm">
        <p class="text-light-error dark:text-dark-error">Si è verificato un errore.</p>
        <button type="button" class="underline" (click)="retry()">Riprova</button>
      </div>
    }

    <!-- Il sentinel DEVE essere l'ultimo elemento -->
    <div #sentinel id="sentinel" style="height: 1px;"></div>
  `
})
export class HistoryComponent implements OnInit, OnDestroy, AfterViewInit {

  // ======================= DEPS =======================
  private readonly historyService = inject(HistoryService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly historyContext = inject(HistoryContextService)
  private readonly zone = inject(NgZone)
  private readonly hostRef = inject(ElementRef<HTMLElement>)
  private readonly scrollContext = inject(ScrollContextService)
  private readonly invalidation = inject(DomainInvalidationService)
  private readonly syncStatus = inject(RealtimeSyncStatusService)
  // ====================================================

  readonly sentinel = viewChild.required<ElementRef<HTMLElement>
// TODO: Skipped for migration because:
//  Accessor inputs cannot be migrated as they are too complex.
>('sentinel');

  readonly triggerDelete = input(false)
  readonly triggerEmptyCheck = input(false)

  readonly emptyChange = output<boolean>();
  readonly itemClick = output<void>();

  private rSub?: Subscription

  private observer?: IntersectionObserver
  private rootEl: HTMLElement | null = null


  serverError = signal<boolean>(false)
  _triggerDelete = signal<boolean>(false)
  _triggerEmptyCheck = signal<boolean>(false)
  fadeOut = signal<string>('')
  private deleteTimeoutId: ReturnType<typeof setTimeout> | undefined
  selectedItemId = signal<string>('')

  items = signal<HistoryDTOExt[]>([])
  loading = false
  done = false
  protected page = 1
  private loadGeneration = 0

  constructor() {

    effect(() => this._triggerDelete.set(this.triggerDelete()))
    effect(() => this._triggerEmptyCheck.set(this.triggerEmptyCheck()))

    effect(() => {
      const selectedItemId = this.selectedItemId()
      this.setItemAsSelected(selectedItemId)
    })

    effect(() => {
      const ni = this.historyContext.newHistoryItem()
      if (ni) {
        queueMicrotask(() => {
          this.historyContext.clearNewHistoryItem()
          this.items.update(items => items.filter(it => it.itemId !== ni.itemId))
          const next = [ni, ...this.items()]
          this.items.set(next)
          this.selectedItemId.set(ni.itemId || '')
        })
      }
    })

    effect(() => {
      const rmId = this.historyContext.removeItemTriggerSignal()
      if (rmId) {
        queueMicrotask(() => {
          const hostRef = new ElementRef(this.findScrollContainer() ?? document.body)
          this.scrollContext.smoothToTop(hostRef, 400)
          this.historyContext.clearRemoveItemTriggerSignal()
          this.items.update(items => items.filter(it => it.itemId !== rmId))
          const selectedItemId = this.items().find((item) => item.itemId === rmId)?.itemId ?? ''
          if (this.selectedItemId() === selectedItemId) {
            this.selectedItemId.set('')
          }
        })
      }
    })

    effect(() => {
      if (this._triggerDelete()) {
        queueMicrotask(() => {
          this._triggerDelete.set(false)
          this.invalidation.publish({ domain: 'dashboard', action: 'profile-changed' })
          this.fadeOut.set('fade-out-ani')
        })
        clearTimeout(this.deleteTimeoutId)
        this.deleteTimeoutId = setTimeout(() => {
          this.items.set([])
          this.fadeOut.set('')
          this.emptyChange.emit(true)
        }, 600)
      }
    })

    effect(() => {
      const event = this.invalidation.last()
      const historyChanged =
        event?.domain === 'history' &&
        event.action === 'changed' &&
        event.remote === true
      const reconnect = event?.domain === 'realtime' && event.action === 'reconcile'
      if (!historyChanged && !reconnect) return
      if (historyChanged) this.syncStatus.markSynchronized()
      queueMicrotask(() => this.reloadHistory())
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
    this.rSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (this.page === 1) {
          queueMicrotask(() => this.loadMore())
        }
        const rootRef = new ElementRef(this.findScrollContainer() ?? document.body)
        const currentPath = e.urlAfterRedirects.split(/[?#]/, 1)[0]
        const pathPrefixes = ['/molecules/collections', '/molecules/detail']
        const scroll = currentPath === `/${routeManifest.myMolecules.path}`
          || pathPrefixes.some(path => currentPath.startsWith(path))
        if (scroll) {
          queueMicrotask(() => this.scrollContext.smoothToTop(rootRef, 400))
        }
        let route = this.route.root
        while (route.firstChild) {
          route = route.firstChild
        }

        const molId = route.snapshot.paramMap.get('molId') ?? ''
        const colId = route.snapshot.paramMap.get('colId') ?? ''
        this.selectedItemId.set(molId || colId || '')

      })
  }

  ngAfterViewInit(): void {
    this.rootEl = this.findScrollContainer()
    this.startObserver()
    if (this.page === 1) {
      queueMicrotask(() => this.loadMore())
    }
  }

  ngOnDestroy(): void {
    this.loadGeneration++
    this.rSub?.unsubscribe();
    if (this.observer) this.observer.disconnect()
    clearTimeout(this.deleteTimeoutId)
  }

  handleItemClick(): void {
    // TODO: The 'emit' function requires a mandatory void argument
    this.itemClick.emit()
  }

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
    if (this.destroyRef.destroyed) return;
    if (this.observer) this.observer.disconnect();

    this.observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          // La callback di IO è fuori dallo NgZone: rientro esplicitamente
          this.zone.run(() => this.loadMore());
        }
      },
      {
        root: this.rootEl,                // <-- usa il contenitore scrollabile reale
        rootMargin: '0px 0px 300px 0px',  // un piccolo prefetch in anticipo
        threshold: 0
      }
    )

    this.observer.observe(this.sentinel().nativeElement)
  }

  private reloadHistory(): void {
    if (this.destroyRef.destroyed) return
    this.loadGeneration++
    this.page = 1
    this.done = false
    this.loading = false
    this.serverError.set(false)
    this.items.set([])
    void this.loadMore()
  }

  async loadMore() {

    if (this.destroyRef.destroyed || this.loading || this.done || this.serverError()) return

    this.loading = true
    const generation = this.loadGeneration
    const requestedPage = this.page

    try {
      const newPage = await firstValueFrom(
        this.historyService.getHistory(requestedPage, 25).pipe(
          debounce(() => interval(80)),
          distinctUntilChanged(),
          takeUntilDestroyed(this.destroyRef)
        )
      )

      if (generation !== this.loadGeneration) return

      if (!newPage || !newPage.items || newPage.items.length === 0) {
        if (this.items().length === 0) {
          this.emptyChange.emit(true)
        }
        this.done = true
      } else {
        this.emptyChange.emit(false)
        this.items.update(items => [...items, ...newPage.items])
        const selectedItemId = this.items().find((item) => item.itemId === this.selectedItemId())?.itemId ?? ''
        if (selectedItemId) {
          this.selectedItemId.set(selectedItemId)
        }
        this.page++
      }

    } catch {
      if (generation === this.loadGeneration) this.serverError.set(true)
    } finally {
      if (generation === this.loadGeneration) this.loading = false
    }
  }

  retry(): Promise<void> {
    this.serverError.set(false)
    return this.loadMore()
  }

  setItemAsSelected(itemId: string): void {
    const items = this.items()
    if (!items.length) {
      return
    }

    for (const item of items) {
      const shouldSelect = !!itemId && item.itemId === itemId
      item.selected.set(shouldSelect)
    }
  }

}
