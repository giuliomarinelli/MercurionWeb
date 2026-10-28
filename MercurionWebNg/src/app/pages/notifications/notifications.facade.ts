import { DestroyRef, Injectable, effect, inject, signal, untracked } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { HttpErrorResponse } from '@angular/common/http'
import { ActivatedRoute, Router } from '@angular/router'
import { firstValueFrom, type Observable } from 'rxjs'
import {
  NotificationListState,
  type NotificationListState as ListState,
  type NotificationRecoveryResponse,
  type UserNotificationDTO,
} from '@mercurion/rest-contracts'
import { InAppNotificationService } from '../../services/in-app-notification.service'
import { NotificationNavigationService } from '../../services/notification-navigation.service'

@Injectable()
export class NotificationsFacade {
  readonly notifications = inject(InAppNotificationService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly navigation = inject(NotificationNavigationService)
  private readonly destroyRef = inject(DestroyRef)

  readonly filter = signal<ListState>(NotificationListState.All)
  readonly items = signal<UserNotificationDTO[]>([])
  readonly selectedId = signal<string | null>(null)
  readonly selected = signal<UserNotificationDTO | null>(null)
  readonly nextCursor = signal<string | null>(null)
  readonly loading = signal(false)
  readonly detailLoading = signal(false)
  readonly listError = signal<string | null>(null)
  readonly moreError = signal(false)
  readonly detailError = signal<string | null>(null)
  readonly actionError = signal<string | null>(null)
  readonly mutationPending = signal(false)
  readonly updatesAvailable = signal(false)

  private listGeneration = 0
  private detailGeneration = 0
  private alive = true
  private recoveryCursor: string | null = null

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.alive = false
      this.listGeneration++
      this.detailGeneration++
    })
    effect(() => {
      this.filter()
      untracked(() => void this.reload())
    })
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      void this.select(params.get('notification'))
    })
    effect(() => {
      const recovery = this.notifications.lastRecovery()
      untracked(() => this.applyRecovery(recovery))
    })
  }

  private read<T>(request: Observable<T>): Promise<T> {
    return firstValueFrom(request.pipe(takeUntilDestroyed(this.destroyRef)))
  }

  changeFilter(filter: ListState): void {
    if (filter === this.filter()) return
    this.listGeneration++
    this.items.set([])
    this.nextCursor.set(null)
    this.filter.set(filter)
  }

  async reload(): Promise<void> {
    const generation = ++this.listGeneration
    const state = this.filter()
    this.loading.set(true)
    this.listError.set(null)
    this.moreError.set(false)
    try {
      const page = await this.read(this.notifications.list({ state }))
      if (!this.alive || generation !== this.listGeneration) return
      this.items.set(page.items)
      this.nextCursor.set(page.nextCursor)
      this.updatesAvailable.set(false)
    } catch {
      if (this.alive && generation === this.listGeneration) {
        this.listError.set('Non è stato possibile caricare le notifiche. Riprova.')
      }
    } finally {
      if (this.alive && generation === this.listGeneration) this.loading.set(false)
    }
  }

  async loadMore(): Promise<void> {
    const cursor = this.nextCursor()
    if (!cursor || this.loading()) return
    const generation = this.listGeneration
    const state = this.filter()
    this.loading.set(true)
    this.listError.set(null)
    try {
      const page = await this.read(this.notifications.list({ cursor, state }))
      if (!this.alive || generation !== this.listGeneration || state !== this.filter()) return
      this.items.update((current) => {
        const ids = new Set(current.map((item) => item.id))
        return [
          ...current,
          ...page.items.filter((item) => {
            if (ids.has(item.id)) return false
            ids.add(item.id)
            return true
          }),
        ]
      })
      this.nextCursor.set(page.nextCursor)
    } catch {
      if (this.alive && generation === this.listGeneration) {
        this.listError.set(
          'Non è stato possibile caricare altre notifiche. Riprova dal pulsante qui sotto.'
        )
        this.moreError.set(true)
      }
    } finally {
      if (this.alive && generation === this.listGeneration) this.loading.set(false)
    }
  }

  openNotification(item: UserNotificationDTO): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { notification: item.id },
      queryParamsHandling: 'merge',
    })
  }

  async closeDetail(): Promise<void> {
    this.detailGeneration++
    this.selectedId.set(null)
    this.selected.set(null)
    this.detailLoading.set(false)
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { notification: null },
      queryParamsHandling: 'merge',
    })
  }

  retryDetail(): void {
    void this.select(this.selectedId())
  }

  private async select(id: string | null, markRead = true): Promise<void> {
    const generation = ++this.detailGeneration
    this.selectedId.set(id)
    this.selected.set(null)
    this.detailError.set(null)
    this.detailLoading.set(Boolean(id))
    if (!id) return
    const current = () => this.alive && generation === this.detailGeneration
    try {
      let detail = await this.read(this.notifications.get(id))
      if (!current()) return
      if (markRead && !detail.readAt) {
        await this.notifications.setRead(id, true)
        if (!current()) return
        detail = await this.read(this.notifications.get(id))
      }
      if (!current()) return
      this.selected.set(detail)
      this.patchItem(detail)
    } catch (error) {
      if (!current()) return
      const unavailable =
        error instanceof HttpErrorResponse && [400, 403, 404].includes(error.status)
      this.detailError.set(
        unavailable
          ? 'Questa notifica non è disponibile o non è più accessibile.'
          : 'Non è stato possibile aprire la notifica. Controlla la connessione e riprova.'
      )
    } finally {
      if (current()) this.detailLoading.set(false)
    }
  }

  private patchItem(detail: UserNotificationDTO): void {
    this.items.update((items) =>
      items
        .map((item) => (item.id === detail.id ? detail : item))
        .filter((item) => !item.dismissedAt && (this.filter() !== 'unread' || !item.readAt))
    )
  }

  private applyRecovery(recovery: NotificationRecoveryResponse | null): void {
    if (!recovery || recovery.cursor === this.recoveryCursor) return
    const baseline = this.recoveryCursor === null
    this.recoveryCursor = recovery.cursor
    if (baseline) return
    for (const change of recovery.changes) {
      const item = change.notification
      if (change.kind === 'created' && !this.items().some((existing) => existing.id === item.id)) {
        this.updatesAvailable.set(true)
      } else if (change.kind === 'dismissed') {
        this.items.update((items) => items.filter((existing) => existing.id !== item.id))
        if (this.selectedId() === item.id) {
          this.detailGeneration++
          this.selected.set(null)
          this.detailLoading.set(false)
          this.detailError.set('Questa notifica non è più disponibile.')
        }
      } else {
        this.patchItem(item)
        if (this.selected()?.id === item.id) this.selected.set(item)
      }
    }
  }

  private async action(
    operation: () => Promise<void>,
    completed: () => Promise<void>
  ): Promise<void> {
    if (this.mutationPending()) return
    this.mutationPending.set(true)
    this.actionError.set(null)
    try {
      await operation()
      if (this.alive) await completed()
    } catch {
      if (this.alive)
        this.actionError.set('Non è stato possibile completare l’operazione. Riprova.')
    } finally {
      if (this.alive) this.mutationPending.set(false)
    }
  }

  setRead(item: UserNotificationDTO, read: boolean): Promise<void> {
    return this.action(
      () => this.notifications.setRead(item.id, read),
      async () => {
        await this.reload()
        if (this.selectedId() === item.id) await this.select(item.id, false)
      }
    )
  }

  markAllRead(): Promise<void> {
    return this.action(
      () => this.notifications.markAllReadThroughCurrentCursor(),
      async () => {
        await this.reload()
        if (this.selectedId()) await this.select(this.selectedId(), false)
      }
    )
  }

  dismiss(item: UserNotificationDTO): Promise<void> {
    return this.action(
      () => this.notifications.dismiss(item.id),
      async () => {
        if (this.selectedId() === item.id) await this.closeDetail()
        await this.reload()
      }
    )
  }

  dismissAll(): Promise<void> {
    return this.action(
      () => this.notifications.dismissAllThroughCurrentCursor(),
      async () => {
        await this.closeDetail()
        await this.reload()
      }
    )
  }

  async openTarget(item: UserNotificationDTO): Promise<void> {
    try {
      const opened = await this.navigation.openTarget(item)
      if (!opened && this.alive)
        this.actionError.set('Non è stato possibile aprire il contenuto collegato.')
    } catch {
      if (this.alive) this.actionError.set('Non è stato possibile aprire il contenuto collegato.')
    }
  }
}
