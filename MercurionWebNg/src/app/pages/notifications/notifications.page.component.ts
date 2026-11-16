import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  untracked,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { NavigationEnd, Router, Scroll } from '@angular/router'
import { filter } from 'rxjs'
import { NotificationListState } from '@mercurion/rest-contracts'
import { NotificationDetailComponent } from '../../components/notifications/notification-detail.component'
import { NotificationListComponent } from '../../components/notifications/notification-list.component'
import { ButtonComponent } from '../../components/common/button/button.component'
import { NotificationsFacade } from './notifications.facade'
import { injectBrowserResourceOwner } from '../../utils/browser-resource-owner.util'
import { DialogShellComponent } from '../../components/common/dialog-shell/dialog-shell.component'
import { ScrollContextService } from '../../services/context/scroll-context.service'

@Component({
  selector: 'm-notifications-page',
  imports: [
    NotificationDetailComponent,
    NotificationListComponent,
    ButtonComponent,
    DialogShellComponent,
  ],
  providers: [NotificationsFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      class="main-container w-full min-w-0 py-6 text-on-surface-main"
      aria-labelledby="notifications-heading"
    >
      <header
        class="flex flex-wrap items-start justify-between gap-5 border-b border-token-border/50 pb-6"
      >
        <div class="min-w-0">
          <h1
            id="notifications-heading"
            tabindex="-1"
            class="focus:outline-none text-2xl font-semibold leading-tight sm:text-3xl"
          >
            Centro notifiche
          </h1>
          <p class="mt-2 max-w-xl text-sm leading-relaxed text-on-surface-secondary">
            Aggiornamenti sulla sicurezza del tuo account e sulle richieste di assistenza.
          </p>
          <p class="mt-3 text-sm font-medium" role="status" aria-live="polite">
            {{ vm.notifications.unreadCount() }}
            {{
              vm.notifications.unreadCount() === 1 ? 'notifica non letta' : 'notifiche non lette'
            }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2" [class]="vm.selectedId() ? 'hidden xl:flex' : ''">
          <m-button
            variant="outline"
            size="sm"
            [disabled]="
              vm.mutationPending() ||
              !vm.notifications.syncCursor() ||
              vm.notifications.unreadCount() === 0
            "
            [loading]="vm.pendingAction()?.kind === 'readAll'"
            ariaLabel="Segna tutte come lette"
            (pressed)="vm.markAllRead()"
            >Segna tutte come lette</m-button
          >
          <m-button
            variant="destructive"
            size="sm"
            [disabled]="
              vm.mutationPending() || !vm.notifications.syncCursor() || vm.items().length === 0
            "
            (pressed)="vm.askDismissAll()"
            >Elimina tutte</m-button
          >
        </div>
      </header>
      <p
        class="mt-3 text-xs leading-relaxed text-on-surface-secondary"
        [class]="vm.selectedId() ? 'hidden xl:block' : ''"
      >
        Le azioni su tutte le notifiche includono anche quelle non ancora caricate, fino all’ultimo
        aggiornamento ricevuto.
      </p>

      @if (vm.notifications.syncState() === 'degraded') {
        <div
          class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-token-control border border-token-border/50 bg-surface-elevated p-4"
        >
          <p class="text-sm leading-relaxed" role="status">
            Gli aggiornamenti possono arrivare in ritardo. Il recupero automatico è attivo.
          </p>
          <m-button
            size="sm"
            variant="outline"
            [loading]="vm.syncPending()"
            ariaLabel="Riprova sincronizzazione"
            (pressed)="vm.retrySync()"
          >
            Riprova sincronizzazione
          </m-button>
          @if (vm.syncError(); as error) {
            <p class="w-full text-sm" role="alert">{{ error }}</p>
          }
        </div>
      }
      <div role="status" aria-live="polite" aria-atomic="true">
        @if (vm.mutationPending()) {
          <p class="mt-4 text-sm text-on-surface-secondary">Operazione in corso…</p>
        } @else if (vm.actionMessage(); as message) {
          <p class="mt-4 text-sm text-on-surface-secondary">{{ message }}</p>
        }
      </div>
      @if (!vm.confirmation() && vm.actionError(); as error) {
        <div class="mt-5 space-y-3 rounded-token-control border border-status-error/50 p-4 text-sm">
          <p role="alert">{{ error }}</p>
          @if (vm.retryAvailable()) {
            <m-button
              variant="outline"
              size="sm"
              [disabled]="vm.mutationPending()"
              (pressed)="vm.retryAction()"
              >Riprova operazione</m-button
            >
          } @else {
            <m-button variant="outline" size="sm" [disabled]="vm.loading()" (pressed)="vm.reload()"
              >Aggiorna elenco</m-button
            >
          }
        </div>
      }
      <div
        class="mt-6 flex flex-wrap items-center justify-between gap-3"
        [class]="vm.selectedId() ? 'hidden xl:flex' : ''"
      >
        <div class="flex gap-2" role="group" aria-label="Filtra notifiche">
          @for (option of filters; track option.value) {
            <button
              type="button"
              [id]="'notifications-filter-' + option.value"
              class="min-h-11 cursor-pointer rounded-full border border-transparent px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-token-focus md:scroll-mt-24"
              [class.bg-surface-secondary]="vm.filter() === option.value"
              [class.border-token-border]="vm.filter() === option.value"
              [attr.aria-pressed]="vm.filter() === option.value"
              (click)="vm.changeFilter(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>
        <p class="text-xs text-on-surface-secondary">
          {{ vm.items().length }}
          {{ vm.items().length === 1 ? 'notifica caricata' : 'notifiche caricate' }}
        </p>
      </div>
      <div
        class="mt-5 grid min-w-0 items-start gap-6"
        [class]="
          vm.selectedId() || vm.items().length || vm.loading()
            ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]'
            : ''
        "
      >
        <section
          class="min-w-0"
          [class]="vm.selectedId() ? 'hidden xl:block' : ''"
          aria-label="Lista notifiche"
        >
          @if (vm.updatesAvailable()) {
            <div
              class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-token-control border border-token-border/50 bg-surface-elevated p-4"
            >
              <p class="text-sm" role="status">Sono disponibili nuove notifiche.</p>
              <m-button
                size="sm"
                variant="outline"
                [disabled]="vm.loading()"
                (pressed)="vm.reload()"
                >Aggiorna elenco</m-button
              >
            </div>
          }
          @if (vm.listError(); as error) {
            <div
              class="mb-4 space-y-3 rounded-token-control border border-status-error/50 p-4"
              role="alert"
            >
              <p class="text-sm leading-relaxed">{{ error }}</p>
              @if (!vm.moreError()) {
                <m-button variant="outline" (pressed)="vm.reload()">Riprova</m-button>
              }
            </div>
          }
          @if (vm.loading() && !vm.items().length) {
            <div class="space-y-3" role="status" aria-label="Caricamento notifiche">
              @for (slot of [1, 2, 3]; track slot) {
                <div
                  class="min-h-56 space-y-4 rounded-token-surface border border-token-border/50 bg-surface-elevated p-4 sm:p-5 motion-safe:animate-pulse"
                  aria-hidden="true"
                >
                  <div class="h-4 w-24 rounded bg-surface-secondary"></div>
                  <div class="h-6 w-3/4 rounded bg-surface-secondary"></div>
                  <div class="h-4 w-full rounded bg-surface-secondary"></div>
                  <div class="h-4 w-1/2 rounded bg-surface-secondary"></div>
                </div>
              }
            </div>
          } @else if (vm.items().length) {
            <m-notification-list
              [notifications]="vm.items()"
              [selectedId]="vm.selectedId()"
              [pending]="vm.mutationPending()"
              [readPendingId]="vm.pendingAction()?.kind === 'read' ? vm.pendingItemId() : null"
              (opened)="vm.openNotification($event)"
              (readChanged)="vm.setRead($event.notification, !$event.read)"
              (dismissed)="vm.askDismiss($event)"
            />
          } @else if (!vm.listError()) {
            <div
              class="flex min-h-64 flex-col items-center justify-center rounded-token-surface border border-dashed border-token-border/50 bg-surface-elevated px-6 py-10 text-center"
            >
              <h2 class="text-lg font-semibold">
                {{
                  vm.filter() === listState.Unread
                    ? 'Nessuna notifica non letta da mostrare'
                    : 'Nessuna notifica, per ora'
                }}
              </h2>
              <p class="mt-2 max-w-sm text-sm leading-relaxed text-on-surface-secondary">
                {{
                  vm.filter() === listState.Unread
                    ? 'Puoi ritrovare gli aggiornamenti già letti nella sezione Tutte.'
                    : 'Qui ritroverai gli aggiornamenti del tuo account e delle tue richieste di assistenza.'
                }}
              </p>
              @if (vm.filter() === listState.Unread) {
                <m-button class="mt-4" variant="outline" (pressed)="vm.changeFilter(listState.All)"
                  >Mostra tutte</m-button
                >
              }
            </div>
          }
          @if (vm.nextCursor()) {
            <div class="mt-5 flex justify-center">
              <m-button
                variant="outline"
                [disabled]="vm.loading()"
                [loading]="vm.loading()"
                (pressed)="vm.loadMore()"
              >
                {{ vm.loading() ? 'Caricamento…' : 'Carica altre' }}
              </m-button>
            </div>
          }
        </section>
        <aside
          class="min-w-0 scroll-mt-24 m-scroll-thin xl:sticky xl:top-24 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:overscroll-contain"
          aria-label="Dettaglio notifica"
          [class]="vm.selectedId() ? '' : vm.items().length ? 'hidden xl:block' : 'hidden'"
        >
          @if (vm.selectedId()) {
            @if (vm.detailLoading()) {
              <div
                class="min-h-64 rounded-token-surface border border-token-border/50 bg-surface-elevated p-5"
                role="status"
              >
                <m-button variant="ghost" size="sm" (pressed)="vm.closeDetail()"
                  >Torna alle notifiche</m-button
                >
                <p class="mt-5 text-sm text-on-surface-secondary">Caricamento del dettaglio…</p>
              </div>
            } @else if (vm.detailError(); as error) {
              <div
                class="space-y-4 rounded-token-surface border border-token-border/50 bg-surface-elevated p-5"
              >
                <h2
                  id="notification-detail-error"
                  tabindex="-1"
                  class="focus:outline-none text-lg font-semibold"
                >
                  Notifica non disponibile
                </h2>
                <p class="text-sm leading-relaxed text-on-surface-secondary" role="alert">
                  {{ error }}
                </p>
                <div class="flex flex-wrap gap-3">
                  <m-button variant="outline" (pressed)="vm.retryDetail()">Riprova</m-button>
                  <m-button variant="ghost" (pressed)="vm.closeDetail()"
                    >Torna alle notifiche</m-button
                  >
                </div>
              </div>
            } @else {
              <m-notification-detail
                [notification]="vm.selected()"
                [pending]="vm.mutationPending()"
                [readPending]="
                  vm.pendingAction()?.kind === 'read' && vm.pendingItemId() === vm.selectedId()
                "
                (closed)="vm.closeDetail()"
                (targetOpened)="vm.openTarget($event)"
                (readChanged)="vm.setRead($event.notification, !$event.read)"
                (dismissed)="vm.askDismiss($event)"
              />
            }
          } @else {
            <div
              class="flex min-h-64 flex-col justify-center rounded-token-surface border border-dashed border-token-border/50 px-6 py-10 text-center"
            >
              <h2 class="text-base font-semibold">Uno spazio per ogni aggiornamento</h2>
              <p class="mt-2 text-sm leading-relaxed text-on-surface-secondary">
                Seleziona una notifica per leggerne il contenuto completo.
              </p>
            </div>
          }
        </aside>
      </div>
    </main>
    <m-dialog-shell
      [open]="!!vm.confirmation()"
      [mounted]="!!vm.confirmation()"
      labelledBy="notification-confirm-title"
      describedBy="notification-confirm-description"
      [dismissalPolicy]="{ escape: !vm.mutationPending(), backdrop: !vm.mutationPending() }"
      (dismissed)="vm.cancelConfirmation()"
    >
      @if (vm.confirmation(); as confirmation) {
        <section
          class="space-y-5 p-5 text-on-surface-main sm:p-6"
          [attr.aria-busy]="vm.mutationPending()"
        >
          <h2 id="notification-confirm-title" class="text-xl font-semibold leading-snug">
            {{
              confirmation.kind === 'dismiss'
                ? 'Elimina questa notifica?'
                : 'Elimina tutte le notifiche?'
            }}
          </h2>
          @if (confirmation.kind === 'dismiss') {
            <p
              class="max-h-24 overflow-y-auto m-scroll-thin text-sm font-semibold [overflow-wrap:anywhere]"
            >
              {{ confirmation.item.title }}
            </p>
          }
          <p
            id="notification-confirm-description"
            class="text-sm leading-relaxed text-on-surface-secondary"
          >
            @if (confirmation.kind === 'dismissAll') {
              Saranno rimosse dalla tua lista tutte le notifiche fino all’aggiornamento ricevuto
              prima di aprire questa conferma, anche quelle non caricate o escluse dal filtro. Le
              notifiche successive resteranno disponibili.
            } @else {
              La notifica sarà rimossa dalla tua lista.
            }
            Il contenuto collegato non verrà eliminato. Non è disponibile un ripristino.
          </p>
          @if (vm.actionError(); as error) {
            <p class="text-sm leading-relaxed" role="alert">{{ error }}</p>
          }
          <div class="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              cdkFocusInitial
              class="min-h-11 cursor-pointer rounded-token-control border border-token-focus px-4 py-2.5 text-sm font-semibold text-(--m-color-control-outline-text) transition-colors hover:bg-(--m-color-control-outline-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-token-focus disabled:cursor-not-allowed disabled:opacity-55"
              [disabled]="vm.mutationPending()"
              (click)="vm.cancelConfirmation()"
            >
              Annulla
            </button>
            <m-button
              variant="destructive"
              [loading]="vm.mutationPending()"
              [ariaLabel]="confirmation.kind === 'dismiss' ? 'Elimina notifica' : 'Elimina tutte'"
              (pressed)="vm.confirmDismiss()"
            >
              {{
                vm.actionError()
                  ? 'Riprova eliminazione'
                  : confirmation.kind === 'dismiss'
                    ? 'Elimina notifica'
                    : 'Elimina tutte'
              }}
            </m-button>
          </div>
        </section>
      }
    </m-dialog-shell>
  `,
})
export class NotificationsPageComponent {
  protected readonly vm = inject(NotificationsFacade)
  protected readonly listState = NotificationListState
  protected readonly filters = [
    { value: NotificationListState.All, label: 'Tutte' },
    { value: NotificationListState.Unread, label: 'Non lette' },
  ]
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly resources = injectBrowserResourceOwner()
  private readonly router = inject(Router)
  private readonly scrolling = inject(ScrollContextService)
  private readonly routerScrollTick = signal(0)
  private lastRouterSelection: string | null | undefined
  private previousSelection: string | null = null
  private focusedSelection: string | null = null
  private confirmationWasOpen = false
  private returnSelection: string | null = null
  private returnScrollTick = 0

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is Scroll => event instanceof Scroll),
        takeUntilDestroyed()
      )
      .subscribe((event) => {
        const url =
          event.routerEvent instanceof NavigationEnd
            ? event.routerEvent.urlAfterRedirects
            : event.routerEvent.url
        const selection = this.router.parseUrl(url).queryParams['notification'] ?? null
        if (selection === this.lastRouterSelection) return
        this.lastRouterSelection = selection
        this.routerScrollTick.update((tick) => tick + 1)
      })
    afterNextRender(() =>
      this.host.nativeElement
        .querySelector<HTMLElement>('#notifications-heading')
        ?.focus({ preventScroll: true })
    )
    afterRenderEffect(() => {
      const id = this.vm.selectedId()
      const loading = this.vm.detailLoading()
      this.vm.selected()
      this.vm.detailError()
      const confirming = this.vm.confirmation() !== null
      const scrollTick = this.routerScrollTick()
      untracked(() => {
        const root = this.host.nativeElement
        const confirmationClosed = this.confirmationWasOpen && !confirming
        this.confirmationWasOpen = confirming
        if (confirming) return
        if (confirmationClosed) {
          this.resources.requestAnimationFrame(() => {
            if (this.vm.confirmation() || document.activeElement !== document.body) return
            root.querySelector<HTMLElement>('#notifications-filter-' + this.vm.filter())?.focus()
          })
        }
        const desktop = window.matchMedia('(min-width: 768px)').matches
        const focusKey =
          id + ':' + (this.vm.detailError() ? 'error' : 'ready') + ':' + (desktop ? scrollTick : 0)
        if (loading) this.focusedSelection = null
        if (id && !loading && this.focusedSelection !== focusKey) {
          this.returnSelection = null
          const heading = root.querySelector<HTMLElement>(
            '#notification-detail-title, #notification-detail-error'
          )
          heading?.focus({ preventScroll: true })
          if (desktop) {
            this.resources.requestAnimationFrame(() => {
              if (this.vm.selectedId() !== id || this.vm.detailLoading() || this.vm.confirmation())
                return
              const detail = root.querySelector<HTMLElement>(
                'aside[aria-label="Dettaglio notifica"]'
              )
              // A sticky aside moves with scrolling; its grid is the stable document anchor.
              if (detail) this.alignDesktopCard(detail.parentElement ?? detail)
            })
          } else {
            heading?.scrollIntoView({ block: 'start', behavior: 'instant' })
          }
          this.focusedSelection = focusKey
        } else if (!id && this.previousSelection) {
          this.returnSelection = this.previousSelection
          this.returnScrollTick = scrollTick
          this.restoreListFocus(this.previousSelection)
          this.focusedSelection = null
        } else if (desktop && !id && this.returnSelection && this.returnScrollTick !== scrollTick) {
          this.returnScrollTick = scrollTick
          this.restoreListFocus(this.returnSelection)
        }
        this.previousSelection = id
      })
    })
  }

  private restoreListFocus(id: string): void {
    this.resources.requestAnimationFrame(() => {
      if (this.vm.selectedId() || this.vm.confirmation()) return
      const root = this.host.nativeElement
      const opener = root.querySelector<HTMLElement>(
        '[data-notification-open="' + CSS.escape(id) + '"]'
      )
      const target =
        opener ?? root.querySelector<HTMLElement>('#notifications-filter-' + this.vm.filter())
      target?.focus({ preventScroll: true })
      if (!target) return
      if (window.matchMedia('(min-width: 768px)').matches) {
        this.alignDesktopCard(opener?.closest<HTMLElement>('article') ?? target)
      } else {
        target.scrollIntoView({ block: 'nearest', behavior: 'instant' })
      }
    })
  }

  private alignDesktopCard(target: HTMLElement): void {
    const scrollRoot =
      this.scrolling.scrollRootRef() ??
      new ElementRef(this.host.nativeElement.ownerDocument.scrollingElement as HTMLElement)
    const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 96
    // Cancel the router's native CSS smooth scroll even when our target equals the current position.
    scrollRoot.nativeElement.scrollTo({ top: scrollRoot.nativeElement.scrollTop, behavior: 'instant' })
    const y = this.scrolling.getScrollYRelativeToRoot(target, scrollRoot.nativeElement) - margin
    // Run after Router Scroll restoration and own the animation so CSS smooth-to-zero cannot win later.
    this.scrolling.smoothTo(scrollRoot, Math.max(0, y), 240)
  }
}
