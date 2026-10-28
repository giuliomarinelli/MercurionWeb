import { signal } from '@angular/core'
import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import { Router } from '@angular/router'
import { routeManifest } from '../../../route-manifest'
import { InAppNotificationService } from '../../../services/in-app-notification.service'
import { RealtimeSyncStatusService } from '../../../services/realtime-sync-status.service'
import { HeaderNotificationsComponent } from './header-notifications.component'

describe('HeaderNotificationsComponent', () => {
  const unreadCount = signal(3)
  const catchUpCount = signal(0)
  const synchronized = signal(false)
  let dismissCatchUp: jasmine.Spy
  let acknowledgeCatchUpPresented: jasmine.Spy
  let navigate: jasmine.Spy

  beforeEach(() => {
    unreadCount.set(3)
    catchUpCount.set(0)
    synchronized.set(false)
    dismissCatchUp = jasmine.createSpy('dismissCatchUp')
    acknowledgeCatchUpPresented = jasmine.createSpy('acknowledgeCatchUpPresented').and.resolveTo()
    navigate = jasmine.createSpy('navigate').and.resolveTo(true)
    TestBed.configureTestingModule({
      imports: [HeaderNotificationsComponent],
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: RealtimeSyncStatusService, useValue: { visible: synchronized } },
        {
          provide: InAppNotificationService,
          useValue: { unreadCount, catchUpCount, dismissCatchUp, acknowledgeCatchUpPresented },
        },
      ],
    })
  })

  it('shows the unread count and opens notifications from the bell', () => {
    const fixture = TestBed.createComponent(HeaderNotificationsComponent)
    fixture.detectChanges()
    const button = fixture.nativeElement.querySelector(
      'm-notification-button button'
    ) as HTMLButtonElement
    expect(button.textContent).toContain('3')
    button.click()
    expect(dismissCatchUp).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith([routeManifest.notifications.build({})])
  })

  it('leaves one flex gap between controls when the sync badge has no content', () => {
    const fixture = TestBed.createComponent(HeaderNotificationsComponent)
    fixture.detectChanges()
    const group = document.createElement('div')
    group.style.cssText = 'display:flex;align-items:center;gap:8px'
    const search = document.createElement('button')
    const theme = document.createElement('button')
    search.style.cssText = theme.style.cssText = 'width:40px;height:40px'
    group.append(search, fixture.nativeElement, theme)
    document.body.appendChild(group)
    try {
      const bell = group.querySelector('m-notification-button button')!
      expect(bell.getBoundingClientRect().left - search.getBoundingClientRect().right).toBeCloseTo(
        8,
        1
      )
      expect(theme.getBoundingClientRect().left - bell.getBoundingClientRect().right).toBeCloseTo(
        8,
        1
      )
      synchronized.set(true)
      fixture.detectChanges()
      expect(group.querySelector('[role="status"]')).not.toBeNull()
      expect(theme.getBoundingClientRect().left - bell.getBoundingClientRect().right).toBeCloseTo(
        8,
        1
      )
    } finally {
      fixture.destroy()
      group.remove()
    }
  })

  it('acknowledges catch-up only after it is rendered and allows dismissing it', () => {
    const fixture = TestBed.createComponent(HeaderNotificationsComponent)
    fixture.detectChanges()
    expect(acknowledgeCatchUpPresented).not.toHaveBeenCalled()
    catchUpCount.set(2)
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).toContain('Hai 2 nuove notifiche')
    expect(acknowledgeCatchUpPresented).toHaveBeenCalledTimes(1)
    const close = Array.from(
      fixture.nativeElement.querySelectorAll(
        'm-notification-catch-up button'
      ) as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Chiudi')!
    close.click()
    expect(dismissCatchUp).toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('renders an acknowledgement error with an explicit retry, without losing the banner', async () => {
    acknowledgeCatchUpPresented.and.rejectWith(new Error('synthetic network failure'))
    const fixture = TestBed.createComponent(HeaderNotificationsComponent)
    catchUpCount.set(2)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'stato di visualizzazione'
    )
    acknowledgeCatchUpPresented.and.resolveTo()
    Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((button) => button.textContent?.trim() === 'Riprova')!
      .click()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(acknowledgeCatchUpPresented).toHaveBeenCalledTimes(2)
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull()
    expect(catchUpCount()).toBe(2)
  })

  it('restores the bell focus when the keyboard dismisses the catch-up message', fakeAsync(() => {
    dismissCatchUp.and.callFake(() => catchUpCount.set(0))
    const fixture = TestBed.createComponent(HeaderNotificationsComponent)
    catchUpCount.set(1)
    fixture.detectChanges()
    const close = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Chiudi')!
    close.focus()
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    fixture.detectChanges()
    tick(20)
    expect(document.activeElement).toBe(
      fixture.nativeElement.querySelector('m-notification-button button')
    )
    expect(navigate).not.toHaveBeenCalled()
    fixture.destroy()
  }))
  for (const width of [320, 375]) {
    it(`keeps the catch-up message and its controls inside a ${width}px header`, async () => {
      catchUpCount.set(125)
      const fixture = TestBed.createComponent(HeaderNotificationsComponent)
      fixture.detectChanges()
      await fixture.whenStable()
      const frame = document.createElement('iframe')
      frame.style.cssText = `position:fixed;top:0;left:0;width:${width}px;height:600px;border:0`
      document.body.appendChild(frame)
      const root = fixture.nativeElement as HTMLElement
      const parent = root.parentElement!
      try {
        const doc = frame.contentDocument!
        doc.body.style.margin = '0'
        const style = doc.createElement('style')
        style.textContent = Array.from(document.styleSheets)
          .flatMap(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText)).join('\n')
        doc.head.appendChild(style)
        const header = doc.createElement('header')
        header.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:16px'
        const theme = doc.createElement('button')
        theme.style.cssText = 'width:40px;height:40px'
        theme.textContent = 'Tema'
        header.append(root, theme)
        doc.body.appendChild(header)
        const message = doc.querySelector('aside') as HTMLElement
        expect(message.getBoundingClientRect().left).toBeGreaterThanOrEqual(0)
        expect(message.getBoundingClientRect().right).toBeLessThanOrEqual(width)
        for (const button of message.querySelectorAll('button')) {
          expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(width)
        }
      } finally {
        parent.appendChild(root)
        frame.remove()
        fixture.destroy()
      }
    })
  }

})
