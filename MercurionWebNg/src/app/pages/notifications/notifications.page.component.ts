import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import {
  NotificationListState,
  type NotificationListState as NotificationListStateType,
  type UserNotificationDTO
} from '@mercurion/rest-contracts'

import { NotificationDetailComponent } from '../../components/notifications/notification-detail.component'
import { NotificationListComponent } from '../../components/notifications/notification-list.component'
import { InAppNotificationService } from '../../services/in-app-notification.service'
import { NotificationNavigationService } from '../../services/notification-navigation.service'
import { routeManifest } from '../../route-manifest'

@Component({
  selector: 'm-notifications-page',
  imports: [
    NotificationDetailComponent,
    NotificationListComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="main-container" role="main">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="h1-underline">Notifiche</h1>
          <p class="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {{ notifications.unreadCount() }}
            {{ notifications.unreadCount() === 1 ? 'notifica non letta' : 'notifiche non lette' }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-600"
            [disabled]="notifications.unreadCount() === 0"
            (click)="markAllRead()"
          >
            Segna tutte come lette
          </button>
          <button
            type="button"
            class="rounded-md border border-light-error px-3 py-2 text-sm font-semibold text-light-error dark:border-dark-error dark:text-dark-error"
            [disabled]="items().length === 0"
            (click)="dismissAll()"
          >
            Elimina tutte
          </button>
        </div>
      </div>

      <div class="mt-6 flex gap-2" role="group" aria-label="Filtra notifiche">
        <button
          type="button"
          [class]="filter() === listState.All
            ? 'rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold dark:bg-neutral-700'
            : 'rounded-full px-4 py-2 text-sm font-semibold'"
          (click)="filter.set(listState.All)"
        >
          Tutte
        </button>
        <button
          type="button"
          [class]="filter() === listState.Unread
            ? 'rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold dark:bg-neutral-700'
            : 'rounded-full px-4 py-2 text-sm font-semibold'"
          (click)="filter.set(listState.Unread)"
        >
          Non lette
        </button>
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <div>
          @if (loading() && items().length === 0) {
            <p class="py-8 text-sm text-slate-500 dark:text-slate-400" role="status">
              Caricamento notifiche…
            </p>
          } @else {
            <m-notification-list
              [notifications]="items()"
              (opened)="openNotification($event)"
              (readChanged)="setRead($event.notification, !$event.read)"
              (dismissed)="dismiss($event)"
            />

            @if (nextCursor()) {
              <div class="mt-5 flex justify-center">
                <button
                  type="button"
                  class="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-600"
                  [disabled]="loading()"
                  (click)="loadMore()"
                >
                  {{ loading() ? 'Caricamento…' : 'Carica altre' }}
                </button>
              </div>
            }
          }
        </div>

        <div>
          <m-notification-detail
            [notification]="selected()"
            (closed)="closeDetail()"
            (targetOpened)="openTarget($event)"
            (readChanged)="setRead($event.notification, !$event.read)"
            (dismissed)="dismiss($event)"
          />
        </div>
      </div>
    </main>
  `
})
export class NotificationsPageComponent {
  protected readonly notifications = inject(InAppNotificationService)
  private readonly navigation = inject(NotificationNavigationService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)

  protected readonly listState = NotificationListState
  protected readonly filter = signal<NotificationListStateType>(
    NotificationListState.All
  )
  protected readonly items = signal<UserNotificationDTO[]>([])
  protected readonly selected = signal<UserNotificationDTO | null>(null)
  protected readonly nextCursor = signal<string | null>(null)
  protected readonly loading = signal(false)

  private requestGeneration = 0

  constructor() {
    effect(() => {
      this.filter()
      void this.reload()
    })

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const notificationId = params.get('notification')
        if (notificationId) {
          void this.openNotificationById(notificationId)
        } else {
          this.selected.set(null)
        }
      })
  }

  protected async loadMore(): Promise<void> {
    const cursor = this.nextCursor()
    if (!cursor || this.loading()) return

    this.loading.set(true)
    try {
      const page = await firstValueFrom(
        this.notifications.list({
          cursor,
          state: this.filter()
        })
      )
      const existing = new Set(this.items().map(item => item.id))
      this.items.update(current => [
        ...current,
        ...page.items.filter(item => !existing.has(item.id))
      ])
      this.nextCursor.set(page.nextCursor)
    } finally {
      this.loading.set(false)
    }
  }

  protected openNotification(notification: UserNotificationDTO): void {
    void this.router.navigate(
      [routeManifest.notifications.build({})],
      { queryParams: { notification: notification.id } }
    )
  }

  protected async setRead(
    notification: UserNotificationDTO,
    read: boolean
  ): Promise<void> {
    await this.notifications.setRead(notification.id, read)
    await this.refreshNotification(notification.id)
    await this.reload()
  }

  protected async markAllRead(): Promise<void> {
    await this.notifications.markAllReadThroughCurrentCursor()
    await this.reload()
    const selected = this.selected()
    if (selected) await this.refreshNotification(selected.id)
  }

  protected async dismiss(notification: UserNotificationDTO): Promise<void> {
    await this.notifications.dismiss(notification.id)
    if (this.selected()?.id === notification.id) {
      await this.closeDetail()
    }
    await this.reload()
  }

  protected async dismissAll(): Promise<void> {
    await this.notifications.dismissAllThroughCurrentCursor()
    this.selected.set(null)
    await this.router.navigate(
      [routeManifest.notifications.build({})],
      { replaceUrl: true }
    )
    await this.reload()
  }

  protected openTarget(notification: UserNotificationDTO): void {
    void this.navigation.openTarget(notification)
  }

  protected async closeDetail(): Promise<void> {
    this.selected.set(null)
    await this.router.navigate(
      [routeManifest.notifications.build({})],
      { replaceUrl: true }
    )
  }

  private async reload(): Promise<void> {
    const generation = ++this.requestGeneration
    this.loading.set(true)
    try {
      const page = await firstValueFrom(
        this.notifications.list({
          state: this.filter()
        })
      )
      if (generation !== this.requestGeneration) return
      this.items.set(page.items)
      this.nextCursor.set(page.nextCursor)
    } finally {
      if (generation === this.requestGeneration) {
        this.loading.set(false)
      }
    }
  }

  private async openNotificationById(notificationId: string): Promise<void> {
    try {
      let detail = await firstValueFrom(
        this.notifications.get(notificationId)
      )

      if (!detail.readAt) {
        await this.notifications.setRead(notificationId, true)
        detail = await firstValueFrom(
          this.notifications.get(notificationId)
        )
      }

      this.selected.set(detail)
      this.items.update(items =>
        items.map(item => item.id === detail.id ? detail : item)
      )
    } catch {
      this.selected.set(null)
      await this.router.navigate(
        [routeManifest.notifications.build({})],
        { replaceUrl: true }
      )
    }
  }

  private async refreshNotification(notificationId: string): Promise<void> {
    try {
      const detail = await firstValueFrom(
        this.notifications.get(notificationId)
      )
      this.selected.update(current =>
        current?.id === detail.id ? detail : current
      )
      this.items.update(items =>
        items.map(item => item.id === detail.id ? detail : item)
      )
    } catch {
      this.selected.update(current =>
        current?.id === notificationId ? null : current
      )
    }
  }
}
