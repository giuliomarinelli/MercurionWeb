import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  untracked,
} from '@angular/core'
import { NotificationListState } from '@mercurion/rest-contracts'
import { NotificationDetailComponent } from '../../components/notifications/notification-detail.component'
import { NotificationListComponent } from '../../components/notifications/notification-list.component'
import { ButtonComponent } from '../../components/common/button/button.component'
import { NotificationsFacade } from './notifications.facade'
import { injectBrowserResourceOwner } from '../../utils/browser-resource-owner.util'

@Component({
  selector: 'm-notifications-page',
  imports: [NotificationDetailComponent, NotificationListComponent, ButtonComponent],
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
            [disabled]="vm.mutationPending() || vm.notifications.unreadCount() === 0"
            (pressed)="vm.markAllRead()"
            >Segna tutte come lette</m-button
          >
          <m-button
            variant="ghost"
            size="sm"
            class="[&_button]:text-light-error dark:[&_button]:text-dark-error-hc"
            [disabled]="vm.mutationPending() || vm.items().length === 0"
            (pressed)="vm.dismissAll()"
            >Elimina tutte</m-button
          >
        </div>
      </header>

      @if (vm.actionError(); as error) {
        <p
          class="mt-5 rounded-token-control border border-status-error/50 p-4 text-sm"
          role="alert"
        >
          {{ error }}
        </p>
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
              class="min-h-11 cursor-pointer rounded-full border border-transparent px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-token-focus"
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
      <div class="mt-5 grid min-w-0 items-start gap-6"
        [class]="vm.selectedId() || vm.items().length || vm.loading() ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]' : ''">
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
              (opened)="vm.openNotification($event)"
              (readChanged)="vm.setRead($event.notification, !$event.read)"
              (dismissed)="vm.dismiss($event)"
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
                <h2 id="notification-detail-error" tabindex="-1" class="focus:outline-none text-lg font-semibold">
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
                (closed)="vm.closeDetail()"
                (targetOpened)="vm.openTarget($event)"
                (readChanged)="vm.setRead($event.notification, !$event.read)"
                (dismissed)="vm.dismiss($event)"
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
  private previousSelection: string | null = null
  private focusedSelection: string | null = null

  constructor() {
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
      untracked(() => {
        const root = this.host.nativeElement
        const focusKey = id + ':' + (this.vm.detailError() ? 'error' : 'ready')
        if (loading) this.focusedSelection = null
        if (id && !loading && this.focusedSelection !== focusKey) {
          const heading = root.querySelector<HTMLElement>(
            '#notification-detail-title, #notification-detail-error'
          )
          heading?.focus({ preventScroll: true })
          if (window.matchMedia('(max-width: 1279px)').matches) {
            heading?.scrollIntoView({ block: 'start', behavior: 'instant' })
          }
          this.focusedSelection = focusKey
        } else if (!id && this.previousSelection) {
          const previousId = this.previousSelection
          this.resources.requestAnimationFrame(() => {
            if (this.vm.selectedId()) return
            const opener = root.querySelector<HTMLElement>(
              '[data-notification-open="' + CSS.escape(previousId) + '"]'
            )
            const fallback = root.querySelector<HTMLElement>('#notifications-filter-' + this.vm.filter())
            const target = opener ?? fallback
            target?.focus({ preventScroll: true })
            target?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
          })
          this.focusedSelection = null
        }
        this.previousSelection = id
      })
    })
  }
}
