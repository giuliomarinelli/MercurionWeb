import { ApplicationRef, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { NavigationEnd, provideRouter, Router, Scroll } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { of, Subject, throwError } from 'rxjs'
import type {
  NotificationPageResponse,
  NotificationRecoveryResponse,
  UserNotificationDTO,
} from '@mercurion/rest-contracts'
import { NotificationsPageComponent } from './notifications.page.component'
import { InAppNotificationService } from '../../services/in-app-notification.service'
import { NotificationNavigationService } from '../../services/notification-navigation.service'
import { notificationFixture } from './notifications.testing'
import {
  blockingViolations,
  formatAxeViolations,
  runAxe,
} from '../../testing/accessibility-test.helpers.spec'

describe('Notification center navigation and requests', () => {
  let service: jasmine.SpyObj<InAppNotificationService>
  const recovery = signal<NotificationRecoveryResponse | null>(null)

  const recoveryEvents = new Subject<NotificationRecoveryResponse>()

  function publishRecovery(value: NotificationRecoveryResponse): void {
    recovery.set(value)
    recoveryEvents.next(value)
  }

  beforeEach(() => {
    recovery.set(null)
    service = jasmine.createSpyObj(
      'Notifications',
      [
        'list',
        'get',
        'setRead',
        'markAllReadThroughCurrentCursor',
        'dismiss',
        'dismissAllThroughCurrentCursor',
        'refresh',
      ],
      {
        unreadCount: signal(3),
        lastRecovery: recovery,
        recoveryApplied: recoveryEvents.asObservable(),
        syncCursor: signal('baseline'),
        syncState: signal('ready'),
      }
    )
    service.list.and.returnValue(of({ items: [notificationFixture('A')], nextCursor: 'page-2' }))
    service.get.and.callFake((id) => of(notificationFixture(id)))
    service.setRead.and.resolveTo()
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'notifications', component: NotificationsPageComponent }]),
        { provide: InAppNotificationService, useValue: service },
        {
          provide: NotificationNavigationService,
          useValue: { openTarget: () => Promise.resolve(true) },
        },
      ],
    })
  })

  async function settle(harness: RouterTestingHarness) {
    await TestBed.inject(ApplicationRef).whenStable()
    harness.detectChanges()
    await Promise.resolve()
    harness.detectChanges()
  }

  it('keeps the latest selected detail when an earlier request completes last', async () => {
    const older = new Subject<UserNotificationDTO>()
    const newer = new Subject<UserNotificationDTO>()
    service.get.and.callFake((id) => (id === 'A' ? older : newer))
    const harness = await RouterTestingHarness.create('/notifications?notification=A')
    await harness.navigateByUrl('/notifications?notification=B')
    newer.next(notificationFixture('B'))
    newer.complete()
    await settle(harness)
    older.next(notificationFixture('A', { readAt: null }))
    older.complete()
    await settle(harness)
    expect(
      harness.routeNativeElement?.querySelector('m-notification-detail')?.textContent
    ).toContain('Contenuto completo B')
    expect(TestBed.inject(Router).url).toContain('notification=B')
    expect(service.setRead).not.toHaveBeenCalled()
  })

  it('does not reopen a detail after its URL selection was cleared', async () => {
    const pending = new Subject<UserNotificationDTO>()
    service.get.and.returnValue(pending)
    const harness = await RouterTestingHarness.create('/notifications?notification=A')
    await harness.navigateByUrl('/notifications')
    pending.next(notificationFixture('A'))
    pending.complete()
    await settle(harness)
    expect(harness.routeNativeElement?.querySelector('#notification-detail-title')).toBeNull()
  })

  it('discards an old next page when the unread filter replaces the list', async () => {
    const more = new Subject<NotificationPageResponse>()
    service.list.and.callFake((options) =>
      options?.cursor
        ? more
        : of({
            items: [
              notificationFixture(
                options?.state === 'unread' ? 'unread' : 'all',
                options?.state === 'unread' ? { readAt: null } : {}
              ),
            ],
            nextCursor: options?.state === 'unread' ? null : 'page-2',
          })
    )
    const harness = await RouterTestingHarness.create('/notifications')
    await settle(harness)
    const buttons = () => Array.from(harness.routeNativeElement!.querySelectorAll('button'))
    buttons()
      .find((button) => button.textContent?.includes('Carica altre'))!
      .click()
    buttons()
      .find((button) => button.textContent?.trim() === 'Non lette')!
      .click()
    await settle(harness)
    more.next({ items: [notificationFixture('stale-page')], nextCursor: null })
    more.complete()
    await settle(harness)
    const list = harness.routeNativeElement!.querySelector('m-notification-list')!
    expect(list.textContent).toContain('Notifica unread')
    expect(list.textContent).not.toContain('stale-page')
  })

  it('shows a recoverable list error instead of a false empty state', async () => {
    service.list.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })))
    const harness = await RouterTestingHarness.create('/notifications')
    await settle(harness)
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain(
      'Non è stato possibile caricare'
    )
    expect(harness.routeNativeElement?.textContent).not.toContain('Nessuna notifica, per ora')
    service.list.and.returnValue(
      of({ items: [notificationFixture('recovered')], nextCursor: null })
    )
    Array.from(harness.routeNativeElement!.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Riprova')!
      .click()
    await settle(harness)
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeNull()
    expect(harness.routeNativeElement?.textContent).toContain('Notifica recovered')
  })

  it('keeps a failed detail URL available for retry and preserves other query parameters on close', async () => {
    service.get.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })))
    const harness = await RouterTestingHarness.create('/notifications?notification=A&extra=kept')
    await settle(harness)
    expect(TestBed.inject(Router).url).toContain('notification=A')
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain(
      'non è disponibile'
    )
    service.get.and.returnValue(of(notificationFixture('A')))
    Array.from(harness.routeNativeElement!.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Riprova')!
      .click()
    await settle(harness)
    expect(
      harness.routeNativeElement?.querySelector('#notification-detail-title')?.textContent
    ).toContain('Notifica A')
    const close = harness.routeNativeElement!.querySelector(
      'm-notification-detail button'
    ) as HTMLButtonElement
    close.click()
    await settle(harness)
    expect(TestBed.inject(Router).url).toBe('/notifications?extra=kept')
  })

  it('retains the loaded page and retries a failed next page without duplicates', async () => {
    service.list.and.callFake((options) =>
      options?.cursor
        ? throwError(() => new HttpErrorResponse({ status: 0 }))
        : of({ items: [notificationFixture('A')], nextCursor: 'page-2' })
    )
    const harness = await RouterTestingHarness.create('/notifications')
    await settle(harness)
    const more = () =>
      Array.from(harness.routeNativeElement!.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Carica altre')
      )!
    more().click()
    await settle(harness)
    expect(harness.routeNativeElement?.textContent).toContain('Notifica A')
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain(
      'altre notifiche'
    )
    service.list.and.returnValue(
      of({
        items: [notificationFixture('A'), notificationFixture('B'), notificationFixture('B')],
        nextCursor: null,
      })
    )
    more().click()
    await settle(harness)
    expect(harness.routeNativeElement?.querySelectorAll('m-notification-list-item').length).toBe(2)
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeNull()
  })

  it('does not automatically mark a selected notification read again after Segna non letta', async () => {
    const harness = await RouterTestingHarness.create('/notifications?notification=A')
    await settle(harness)
    service.get.and.returnValue(of(notificationFixture('A', { readAt: null })))
    const detail = harness.routeNativeElement!.querySelector('m-notification-detail')!
    Array.from(detail.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Segna non letta'))!
      .click()
    await settle(harness)
    expect(service.setRead).toHaveBeenCalledOnceWith('A', false)
    expect(detail.textContent).toContain('Non letta')
  })

  it('offers new recovered items without inserting them ahead of the current reading position', async () => {
    const first = notificationFixture('A')
    publishRecovery({
      cursor: 'baseline',
      snapshotAt: first.createdAt,
      unreadCount: 0,
      unseenCount: 0,
      changes: [],
      hasMore: false,
    })
    const harness = await RouterTestingHarness.create('/notifications?notification=A')
    await settle(harness)
    const heading = harness.routeNativeElement!.querySelector(
      '#notification-detail-title'
    ) as HTMLElement
    heading.focus()
    publishRecovery({
      cursor: 'next',
      snapshotAt: first.createdAt,
      unreadCount: 1,
      unseenCount: 1,
      changes: [{ kind: 'created', notification: notificationFixture('new') }],
      hasMore: false,
    })
    await settle(harness)
    expect(harness.routeNativeElement?.textContent).toContain('Sono disponibili nuove notifiche')
    expect(harness.routeNativeElement?.querySelectorAll('m-notification-list-item').length).toBe(1)
    expect(document.activeElement).toBe(heading)
    service.list.and.returnValue(
      of({ items: [notificationFixture('new'), first], nextCursor: null })
    )
    Array.from(harness.routeNativeElement!.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Aggiorna elenco')!
      .click()
    await settle(harness)
    expect(harness.routeNativeElement?.querySelectorAll('m-notification-list-item').length).toBe(2)
    expect(
      harness.routeNativeElement?.querySelector('#notification-detail-title')?.textContent
    ).toContain('Notifica A')
  })

  it('keeps an explicit unavailable detail when recovery dismisses the selected notification', async () => {
    const first = notificationFixture('A')
    publishRecovery({
      cursor: 'baseline',
      snapshotAt: first.createdAt,
      unreadCount: 0,
      unseenCount: 0,
      changes: [],
      hasMore: false,
    })
    const harness = await RouterTestingHarness.create('/notifications?notification=A')
    await settle(harness)
    publishRecovery({
      cursor: 'next',
      snapshotAt: first.createdAt,
      unreadCount: 0,
      unseenCount: 0,
      changes: [{ kind: 'dismissed', notification: { ...first, dismissedAt: first.createdAt } }],
      hasMore: false,
    })
    await settle(harness)
    expect(harness.routeNativeElement?.querySelector('#notification-detail-error')).not.toBeNull()
    expect(harness.routeNativeElement?.querySelectorAll('m-notification-list-item').length).toBe(0)
    expect(TestBed.inject(Router).url).toContain('notification=A')
  })

  it('keeps card and skeleton footprints aligned for a normal notification', async () => {
    const pending = new Subject<NotificationPageResponse>()
    service.list.and.returnValue(pending)
    const harness = await RouterTestingHarness.create('/notifications')
    await settle(harness)
    const skeleton = harness.routeNativeElement!.querySelector(
      '[aria-label="Caricamento notifiche"] > div'
    ) as HTMLElement
    const height = skeleton.getBoundingClientRect().height
    pending.next({ items: [notificationFixture('A')], nextCursor: null })
    pending.complete()
    await settle(harness)
    const card = harness.routeNativeElement!.querySelector(
      'm-notification-list-item article'
    ) as HTMLElement
    expect(Math.abs(card.getBoundingClientRect().height - height)).toBeLessThanOrEqual(1)
  })

  it('restores list focus after closing the selected detail and exposes the selected filter', async () => {
    const harness = await RouterTestingHarness.create('/notifications?notification=A')
    await settle(harness)
    const close = harness.routeNativeElement!.querySelector(
      'm-notification-detail button'
    ) as HTMLButtonElement
    close.click()
    await settle(harness)
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(document.activeElement).toBe(
      harness.routeNativeElement!.querySelector('[data-notification-open="A"]')
    )
    expect(
      harness
        .routeNativeElement!.querySelector('#notifications-filter-all')
        ?.getAttribute('aria-pressed')
    ).toBe('true')
    expect(
      harness
        .routeNativeElement!.querySelector('#notifications-filter-unread')
        ?.getAttribute('aria-pressed')
    ).toBe('false')
  })

  it('keeps the sticky detail and return card aligned after a late native Router smooth-to-zero', async () => {
    service.get.and.returnValue(
      of(notificationFixture('A', { body: 'Contenuto lungo. '.repeat(500) }))
    )
    const harness = await RouterTestingHarness.create('/notifications')
    await settle(harness)
    const root = harness.routeNativeElement!
    const parent = root.parentElement!
    const frame = document.createElement('iframe')
    frame.style.cssText = 'position:fixed;top:0;left:0;width:1600px;height:600px;border:0'
    document.body.appendChild(frame)
    const media = spyOn(window, 'matchMedia').and.callFake((query) =>
      frame.contentWindow!.matchMedia(query)
    )
    try {
      const doc = frame.contentDocument!
      doc.body.style.margin = '0'
      const styles = doc.createElement('style')
      styles.textContent = Array.from(document.styleSheets)
        .flatMap((sheet) => Array.from(sheet.cssRules).map((rule) => rule.cssText))
        .join('\n')
      doc.head.appendChild(styles)
      const wrapper = doc.createElement('div')
      wrapper.style.paddingBlock = '1500px'
      doc.body.appendChild(wrapper)
      wrapper.appendChild(root)
      await harness.navigateByUrl('/notifications?notification=A')
      await settle(harness)
      await new Promise(resolve => setTimeout(resolve, 400))
      const events = TestBed.inject(Router).events
      if (!(events instanceof Subject)) throw new Error('Router event stream unavailable')
      // Reproduce the configured router restoration after the first render.
      frame.contentWindow!.scrollTo({ top: 0, behavior: 'smooth' })
      events.next(
        new Scroll(
          new NavigationEnd(50, '/notifications?notification=A', '/notifications?notification=A'),
          null,
          null
        )
      )
      await settle(harness)
      await new Promise((resolve) => setTimeout(resolve, 400))
      const detail = doc.querySelector('m-notification-detail section') as HTMLElement
      expect(detail.getBoundingClientRect().top).toBeGreaterThanOrEqual(95)
      expect(detail.getBoundingClientRect().top).toBeLessThanOrEqual(97)
      expect(doc.activeElement?.id).toBe('notification-detail-title')
      const close = detail.querySelector('button') as HTMLButtonElement
      close.click()
      await settle(harness)
      await new Promise(resolve => setTimeout(resolve, 400))
      frame.contentWindow!.scrollTo({ top: 0, behavior: 'smooth' })
      events.next(new Scroll(new NavigationEnd(51, '/notifications', '/notifications'), null, null))
      await settle(harness)
      await new Promise((resolve) => setTimeout(resolve, 400))
      const opener = doc.querySelector('[data-notification-open="A"]') as HTMLElement
      const card = opener.closest('article')!
      expect(card.getBoundingClientRect().top).toBeGreaterThanOrEqual(95)
      expect(card.getBoundingClientRect().top).toBeLessThanOrEqual(97)
      expect(opener.getBoundingClientRect().bottom).toBeLessThanOrEqual(600)
      expect(doc.activeElement).toBe(opener)
    } finally {
      media.and.callThrough()
      parent.appendChild(root)
      frame.remove()
    }
  })

  it('has no serious or critical accessibility violations in the populated center', async () => {
    const harness = await RouterTestingHarness.create('/notifications?notification=A')
    await settle(harness)
    const violations = blockingViolations(await runAxe(harness.routeNativeElement!))
    expect(violations).withContext(formatAxeViolations(violations)).toEqual([])
  })

  it('uses the destructive button variant for deletion in the list, detail and global action', async () => {
    const harness = await RouterTestingHarness.create('/notifications?notification=A')
    await settle(harness)
    const root = harness.routeNativeElement!
    const deletionButtons = Array.from(root.querySelectorAll('button')).filter((button) =>
      ['Elimina', 'Elimina tutte'].includes(button.textContent?.trim() ?? '')
    )
    expect(deletionButtons.length).toBe(3)
    for (const button of deletionButtons) {
      expect(button.classList).toContain('m-button__control--destructive')
      const style = getComputedStyle(button)
      const surface = getComputedStyle(root)
        .getPropertyValue('--m-color-control-destructive')
        .trim()
      const probe = document.createElement('span')
      probe.style.backgroundColor = surface
      root.appendChild(probe)
      expect(style.backgroundColor).toBe(getComputedStyle(probe).backgroundColor)
      probe.remove()
    }
  })

  it('opens an accessible confirmation with safe initial focus and Escape restores its opener', async () => {
    const harness = await RouterTestingHarness.create('/notifications')
    await settle(harness)
    const opener = Array.from(
      harness.routeNativeElement!.querySelectorAll('m-notification-list button')
    ).find((button) => button.textContent?.trim() === 'Elimina') as HTMLButtonElement
    opener.focus()
    opener.click()
    await settle(harness)
    const dialog = harness.routeNativeElement!.querySelector('[role="dialog"]') as HTMLElement
    expect(dialog.getAttribute('aria-labelledby')).toBe('notification-confirm-title')
    expect(dialog.textContent).toContain('Il contenuto collegato non verrà eliminato')
    expect(service.dismiss).not.toHaveBeenCalled()
    expect(document.activeElement?.textContent?.trim()).toBe('Annulla')
    expect(blockingViolations(await runAxe(dialog))).toEqual([])
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await settle(harness)
    expect(harness.routeNativeElement!.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
    expect(service.dismiss).not.toHaveBeenCalled()
  })

  it('keeps a failed deletion in its confirmation and guards double submission until completion', async () => {
    service.dismiss.and.rejectWith(new Error('offline'))
    const harness = await RouterTestingHarness.create('/notifications')
    await settle(harness)
    const buttons = (root: Element) => Array.from(root.querySelectorAll('button'))
    const opener = buttons(harness.routeNativeElement!).find(
      (button) => button.textContent?.trim() === 'Elimina'
    )!
    opener.focus()
    opener.click()
    await settle(harness)
    let dialog = harness.routeNativeElement!.querySelector('[role="dialog"]')!
    buttons(dialog)
      .find((button) => button.textContent?.trim() === 'Elimina notifica')!
      .click()
    await settle(harness)
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('confermare')
    let complete!: () => void
    service.dismiss.and.returnValue(
      new Promise<void>((resolve) => {
        complete = resolve
      })
    )
    const retry = buttons(dialog).find(
      (button) => button.textContent?.trim() === 'Riprova eliminazione'
    )!
    retry.click()
    retry.click()
    harness.detectChanges()
    expect(retry.disabled).toBeTrue()
    expect(retry.getAttribute('aria-label')).toBe('Elimina notifica')
    expect(blockingViolations(await runAxe(dialog))).toEqual([])
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    harness.detectChanges()
    expect(service.dismiss).toHaveBeenCalledTimes(2)
    expect(harness.routeNativeElement!.querySelector('[role="dialog"]')).not.toBeNull()
    complete()
    await settle(harness)
    await new Promise((resolve) => requestAnimationFrame(resolve))
    dialog = harness.routeNativeElement!.querySelector('[role="dialog"]')!
    expect(dialog).toBeNull()
    expect(harness.routeNativeElement!.querySelectorAll('m-notification-list-item').length).toBe(0)
    expect(document.activeElement?.id).toBe('notifications-filter-all')
  })

  for (const width of [320, 375, 640, 1280]) {
    for (const theme of ['light', 'dark']) {
      it(`contains long content and shows a dedicated detail at ${width}px in ${theme}`, async () => {
        const text = 'TitoloLungoSenzaSpazi'.repeat(20)
        const item = notificationFixture('long', {
          title: text,
          summary: text,
          body: text + '\nSeconda riga',
          resourceType: null,
        })
        service.list.and.returnValue(of({ items: [item], nextCursor: null }))
        service.get.and.returnValue(of(item))
        const harness = await RouterTestingHarness.create('/notifications?notification=long')
        await settle(harness)
        const frame = document.createElement('iframe')
        frame.style.cssText = `position:fixed;top:0;left:0;width:${width}px;height:600px;border:0`
        document.body.appendChild(frame)
        const root = harness.routeNativeElement!
        const parent = root.parentElement!
        try {
          const doc = frame.contentDocument!
          doc.documentElement.classList.toggle('dark', theme === 'dark')
          doc.body.style.margin = '0'
          const style = doc.createElement('style')
          style.textContent = Array.from(document.styleSheets)
            .flatMap((sheet) => Array.from(sheet.cssRules).map((rule) => rule.cssText))
            .join('\n')
          doc.head.appendChild(style)
          doc.body.appendChild(root)
          const list = doc.querySelector('[aria-label="Lista notifiche"]') as HTMLElement
          expect(getComputedStyle(list).display === 'none').toBe(width < 1280)
          expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width + 1)
          const detail = doc.querySelector('m-notification-detail section') as HTMLElement
          expect(detail.scrollWidth).toBeLessThanOrEqual(detail.clientWidth + 1)
          expect(detail.textContent).toContain(text)
          expect(detail.textContent).not.toContain('Apri contenuto collegato')
          const close = detail.querySelector('button') as HTMLButtonElement
          close.click()
          await settle(harness)
          const card = doc.querySelector('m-notification-list-item article') as HTMLElement
          expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1)
          expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width + 1)
        } finally {
          parent.appendChild(root)
          frame.remove()
        }
      })
    }
  }
})
