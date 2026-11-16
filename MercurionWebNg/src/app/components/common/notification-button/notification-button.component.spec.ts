import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'

import { NotificationButtonComponent } from './notification-button.component'

describe('NotificationButtonComponent', () => {
  let component: NotificationButtonComponent
  let fixture: ComponentFixture<NotificationButtonComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationButtonComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(NotificationButtonComponent)
    fixture.componentRef.setInput('unreadCount', 0)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
  it('caps the visible count while preserving the complete accessible label', () => {
    fixture.componentRef.setInput('unreadCount', 125)
    fixture.detectChanges()
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement
    expect(button.textContent).toContain('99+')
    expect(button.getAttribute('aria-label')).toBe('Notifiche: 125 non lette')
    expect(button.getAttribute('aria-labelledby')).toBeNull()
    expect(button.querySelector('svg path')).not.toBeNull()
  })

  it('fades in and out while retaining the last count until the badge disappears', fakeAsync(() => {
    fixture.componentRef.setInput('unreadCount', 3)
    fixture.detectChanges()
    const badge = () =>
      fixture.nativeElement.querySelector('[data-notification-badge]') as HTMLElement | null
    expect(badge()?.classList.contains('opacity-0')).toBeTrue()
    tick(40)
    fixture.detectChanges()
    expect(badge()?.classList.contains('opacity-100')).toBeTrue()
    expect(getComputedStyle(badge()!).transitionProperty).toContain('opacity')
    expect(getComputedStyle(badge()!).transitionDuration).toBe('0.35s')
    fixture.componentRef.setInput('unreadCount', 0)
    fixture.detectChanges()
    expect(badge()?.textContent?.trim()).toBe('3')
    expect(badge()?.classList.contains('opacity-0')).toBeTrue()
    tick(400)
    fixture.detectChanges()
    expect(badge()).toBeNull()
    fixture.destroy()
  }))

  it('cancels obsolete hiding callbacks when new notifications arrive during fade-out', fakeAsync(() => {
    for (const count of [1, 0, 8, 0, 1]) {
      fixture.componentRef.setInput('unreadCount', count)
      fixture.detectChanges()
      tick(40)
    }
    tick(500)
    fixture.detectChanges()
    const badge = fixture.nativeElement.querySelector('[data-notification-badge]') as HTMLElement
    expect(badge.textContent?.trim()).toBe('1')
    expect(badge.classList.contains('opacity-100')).toBeTrue()
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-label')).toBe(
      'Notifiche: 1 non letta'
    )
    fixture.destroy()
  }))

  it('cancels animation work on destruction', fakeAsync(() => {
    fixture.componentRef.setInput('unreadCount', 3)
    fixture.detectChanges()
    fixture.destroy()
    tick(500)
  }))
})
