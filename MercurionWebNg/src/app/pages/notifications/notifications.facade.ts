import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { HttpErrorResponse } from '@angular/common/http'
import { ActivatedRoute, Router } from '@angular/router'
import { firstValueFrom, type Observable } from 'rxjs'
import {
  NotificationListState,
  utcInstantFromEpochMs,
  type NotificationListState as ListState,
  type NotificationRecoveryResponse,
  type UserNotificationDTO,
} from '@mercurion/rest-contracts'
import { InAppNotificationService } from '../../services/in-app-notification.service'
import { NotificationNavigationService } from '../../services/notification-navigation.service'

type NotificationAction =
  | { kind: 'read'; item: UserNotificationDTO; read: boolean }
  | { kind: 'readAll'; cursor: string }
  | { kind: 'dismiss'; item: UserNotificationDTO }
  | { kind: 'dismissAll'; cursor: string }

type NotificationDeletion = Extract<NotificationAction, { kind: 'dismiss' | 'dismissAll' }>

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
  readonly pendingAction = signal<NotificationAction | null>(null)
  readonly pendingItemId = computed(() => {
    const action = this.pendingAction()
    return action?.kind === 'read' || action?.kind === 'dismiss' ? action.item.id : null
  })
  readonly mutationPending = computed(() => this.pendingAction() !== null)
  readonly confirmation = signal<NotificationDeletion | null>(null)
  readonly actionMessage = signal<string | null>(null)
  readonly retryAvailable = computed(() => this.failedAction() !== null)
  readonly syncPending = signal(false)
  readonly syncError = signal<string | null>(null)
  readonly updatesAvailable = signal(false)

  private readonly failedAction = signal<NotificationAction | null>(null)
  private changeVersion = 0
  private readonly changes = new Map<string, { version: number; item: UserNotificationDTO }>()
  private listGeneration = 0
  private detailGeneration = 0
  private alive = true
  private recoveryCursor: string | null = null
  private actionCompletion: Promise<void> = Promise.resolve()

  constructor() {
    this.recoveryCursor = this.notifications.lastRecovery()?.cursor ?? null
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
    this.notifications.recoveryApplied
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((recovery) => this.applyRecovery(recovery))
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
    const version = this.changeVersion
    const state = this.filter()
    this.loading.set(true)
    this.listError.set(null)
    this.moreError.set(false)
    try {
      const page = await this.read(this.notifications.list({ state }))
      if (!this.alive || generation !== this.listGeneration) return
      this.items.set(this.reconcile(page.items, version))
      this.nextCursor.set(page.nextCursor)
      if (version === this.changeVersion) this.updatesAvailable.set(false)
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
    const version = this.changeVersion
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
          ...this.reconcile(page.items, version).filter((item) => {
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
    const version = this.changeVersion
    this.selectedId.set(id)
    this.selected.set(null)
    this.detailError.set(null)
    this.detailLoading.set(Boolean(id))
    if (!id) return
    const current = () => this.alive && generation === this.detailGeneration
    try {
      let detail = await this.read(this.notifications.get(id))
      if (!current()) return
      detail = this.changedSince(detail, version)
      if (detail.dismissedAt) throw new HttpErrorResponse({ status: 404 })
      if (markRead && !detail.readAt) {
        // Route navigation can occur while buttons are disabled. Serialize the
        // automatic read as well, without losing its original selection intent.
        await this.actionCompletion
        if (!current()) return
        detail = this.changedSince(detail, version)
        if (detail.dismissedAt) throw new HttpErrorResponse({ status: 404 })
        if (!detail.readAt) await this.execute({ kind: 'read', item: detail, read: true })
        if (!current()) return
        detail = this.changedSince(detail, version)
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

  private remember(item: UserNotificationDTO): void {
    this.changes.set(item.id, { version: ++this.changeVersion, item })
  }

  private changedSince(item: UserNotificationDTO, version: number): UserNotificationDTO {
    const change = this.changes.get(item.id)
    return change && change.version > version ? change.item : item
  }

  private reconcile(items: UserNotificationDTO[], version: number): UserNotificationDTO[] {
    return items
      .map((item) => this.changedSince(item, version))
      .filter((item) => !item.dismissedAt && (this.filter() !== 'unread' || !item.readAt))
  }

  private applyRecovery(recovery: NotificationRecoveryResponse | null): void {
    if (!recovery || recovery.cursor === this.recoveryCursor) return
    this.recoveryCursor = recovery.cursor
    for (const change of recovery.changes) {
      const item = change.notification
      this.remember(item)
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
        if (
          !item.dismissedAt &&
          !item.readAt &&
          this.filter() === 'unread' &&
          !this.items().some((existing) => existing.id === item.id)
        ) {
          this.updatesAvailable.set(true)
        }
        this.patchItem(item)
        if (this.selected()?.id === item.id) this.selected.set(item)
      }
    }
  }

  private execute(action: NotificationAction): Promise<void> {
    if (!this.alive || this.mutationPending()) return Promise.resolve()
    if (action.kind === 'read' && this.changes.get(action.item.id)?.item.dismissedAt) {
      this.failedAction.set(null)
      this.actionError.set('Questa notifica non è più disponibile.')
      return Promise.resolve()
    }
    this.actionCompletion = this.runAction(action)
    return this.actionCompletion
  }

  private async runAction(action: NotificationAction): Promise<void> {
    this.pendingAction.set(action)
    this.failedAction.set(null)
    this.actionError.set(null)
    this.actionMessage.set(null)
    const version = this.changeVersion
    try {
      switch (action.kind) {
        case 'read':
          await this.notifications.setRead(action.item.id, action.read)
          break
        case 'readAll':
          await this.notifications.markAllReadThroughCurrentCursor(action.cursor)
          break
        case 'dismiss':
          await this.notifications.dismiss(action.item.id)
          break
        case 'dismissAll':
          await this.notifications.dismissAllThroughCurrentCursor(action.cursor)
          break
      }
    } catch {
      if (this.alive) {
        this.failedAction.set(action)
        this.actionError.set(
          'Non è stato possibile confermare l’operazione. Puoi riprovare: verrà applicata la stessa richiesta.'
        )
        this.pendingAction.set(null)
      }
      return
    }
    if (!this.alive) return
    this.confirmation.set(null)
    // A successful write is distinct from a failed refresh or navigation.
    try {
      if (action.kind === 'read' || action.kind === 'dismiss') {
        const current =
          this.selected()?.id === action.item.id
            ? this.selected()!
            : (this.items().find((item) => item.id === action.item.id) ?? action.item)
        const changed = this.changes.get(action.item.id)
        const item =
          changed && changed.version > version
            ? changed.item
            : {
                ...current,
                // Recovery supplies the authoritative server timestamp. Until then only
                // the confirmed read/dismiss state is reflected locally.
                ...(action.kind === 'read'
                  ? {
                      readAt: action.read
                        ? (current.readAt ?? utcInstantFromEpochMs(Date.now()))
                        : null,
                    }
                  : { dismissedAt: utcInstantFromEpochMs(Date.now()) }),
              }
        // A recovered dismissal always wins over a concurrent read response.
        this.remember(item)
        this.patchItem(item)
        if (this.selected()?.id === item.id && !item.dismissedAt) this.selected.set(item)
        if (action.kind === 'dismiss' && this.selectedId() === item.id) await this.closeDetail()
        if (!this.alive) return
        this.actionMessage.set(
          action.kind === 'dismiss'
            ? 'Notifica eliminata dalla tua lista.'
            : action.read
              ? 'Notifica segnata come letta.'
              : 'Notifica segnata come non letta.'
        )
      } else {
        this.actionMessage.set(
          action.kind === 'dismissAll'
            ? 'Eliminazione completata per le notifiche incluse nella conferma.'
            : 'Segnate come lette le notifiche incluse nell’operazione.'
        )
        await this.reload()
        if (this.alive && this.selectedId()) await this.select(this.selectedId(), false)
      }
    } catch {
      if (this.alive)
        this.actionError.set(
          'Operazione completata. Aggiorna l’elenco per rileggere lo stato corrente.'
        )
    } finally {
      if (this.alive) this.pendingAction.set(null)
    }
  }

  setRead(item: UserNotificationDTO, read: boolean): Promise<void> {
    return this.execute({ kind: 'read', item, read })
  }

  markAllRead(): Promise<void> {
    const cursor = this.notifications.syncCursor()
    return cursor ? this.execute({ kind: 'readAll', cursor }) : Promise.resolve()
  }

  askDismiss(item: UserNotificationDTO): void {
    if (this.mutationPending()) return
    this.actionError.set(null)
    this.confirmation.set({ kind: 'dismiss', item })
  }

  askDismissAll(): void {
    const cursor = this.notifications.syncCursor()
    if (this.mutationPending() || !cursor) return
    this.actionError.set(null)
    this.confirmation.set({ kind: 'dismissAll', cursor })
  }

  cancelConfirmation(): void {
    if (this.mutationPending()) return
    this.confirmation.set(null)
    this.actionError.set(null)
    this.failedAction.set(null)
  }

  confirmDismiss(): Promise<void> {
    const action = this.confirmation()
    return action ? this.execute(action) : Promise.resolve()
  }

  retryAction(): Promise<void> {
    const action = this.failedAction()
    return action ? this.execute(action) : Promise.resolve()
  }

  async retrySync(): Promise<void> {
    if (this.syncPending()) return
    this.syncPending.set(true)
    this.syncError.set(null)
    try {
      const success = await this.notifications.refresh()
      if (this.alive && !success)
        this.syncError.set('Sincronizzazione non riuscita. Riprova tra poco.')
    } catch {
      if (this.alive) this.syncError.set('Sincronizzazione non riuscita. Riprova tra poco.')
    } finally {
      if (this.alive) this.syncPending.set(false)
    }
  }

  async openTarget(item: UserNotificationDTO): Promise<void> {
    this.failedAction.set(null)
    this.actionError.set(null)
    this.actionMessage.set(null)
    try {
      const opened = await this.navigation.openTarget(item)
      if (!opened && this.alive)
        this.actionError.set('Non è stato possibile aprire il contenuto collegato.')
    } catch {
      if (this.alive) this.actionError.set('Non è stato possibile aprire il contenuto collegato.')
    }
  }
}
