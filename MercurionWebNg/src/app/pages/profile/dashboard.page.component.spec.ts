import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Subject } from 'rxjs'
import { ProfileDTO } from '../../Models/account/account.models'
import { AccountService } from '../../services/account.service'
import { DomainInvalidationService } from '../../services/domain-invalidation.service'
import { DashboardPageComponent } from './dashboard.page.component'
import { dashboardProfile } from './dashboard/dashboard.testing'

// Exercise the actual facade through HTTP-service responses and native retry actions.
describe('Dashboard loading, refresh and retry', () => {
  let fixture: ComponentFixture<DashboardPageComponent>
  let requests: Subject<ProfileDTO>[]
  let load: jasmine.Spy

  beforeEach(async () => {
    requests = []
    load = jasmine.createSpy('getProfileRegistry').and.callFake(() => {
      const response = new Subject<ProfileDTO>()
      requests.push(response)
      return response
    })
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [{ provide: AccountService, useValue: { getProfileRegistry: load } }],
    }).compileComponents()
    fixture = TestBed.createComponent(DashboardPageComponent)
    fixture.detectChanges()
  })

  function respond(profile = dashboardProfile()) {
    requests.at(-1)!.next(profile)
    requests.at(-1)!.complete()
    fixture.detectChanges()
  }

  it('reserves the dashboard geometry while the first request is pending', () => {
    expect(fixture.nativeElement.querySelector('main').getAttribute('aria-busy')).toBe('true')
    expect(fixture.nativeElement.querySelector('m-dashboard-loading')).not.toBeNull()
    expect(fixture.nativeElement.querySelectorAll('[data-dashboard-metric]').length).toBe(4)
    expect(fixture.nativeElement.querySelectorAll('[data-dashboard-chart]').length).toBe(2)
    expect(fixture.nativeElement.querySelector('.fixed')).toBeNull()
  })

  it('renders returned counts and the original initials greeting', () => {
    respond()
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Benvenuta Ada.')
    expect(fixture.nativeElement.querySelector('[role="img"]')?.textContent.trim()).toBe('AL')
    const metrics: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('dl > div'))
    expect(metrics.map((metric) => metric.querySelector('dd')?.textContent?.trim())).toEqual([
      '5',
      '2',
      '3',
      '4',
    ])
    expect(fixture.nativeElement.querySelector('m-dashboard-loading')).toBeNull()
    expect(fixture.nativeElement.querySelector('main').getAttribute('aria-busy')).toBe('false')
  })

  it('renders zero counts for a new workspace without inventing data', () => {
    respond(
      dashboardProfile({ personalMoleculeCount: 0, chemblMoleculeCount: 0, collectionCount: 0 })
    )
    expect(fixture.nativeElement.querySelector('dl')?.textContent).toContain('0')
  })

  it('retries a failed initial request once through the rendered button', () => {
    requests[0].error(new Error('Synthetic outage'))
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'errore nel caricamento della dashboard'
    )
    const retry: HTMLButtonElement = fixture.nativeElement.querySelector('button')
    retry.click()
    retry.click()
    fixture.detectChanges()
    expect(load).toHaveBeenCalledTimes(2)
    expect(fixture.nativeElement.querySelector('m-dashboard-loading')).not.toBeNull()
    respond()
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull()
  })

  it('retains loaded content during realtime refresh and a subsequent failure, then recovers on retry', async () => {
    respond()
    const content: HTMLElement = fixture.nativeElement.querySelector('m-dashboard-metrics-widget')
    TestBed.inject(DomainInvalidationService).publish({
      domain: 'molecule',
      action: 'changed',
      remote: true,
    })
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(load).toHaveBeenCalledTimes(2)
    expect(fixture.nativeElement.querySelector('m-dashboard-metrics-widget')).toBe(content)
    expect(fixture.nativeElement.querySelector('m-dashboard-loading')).toBeNull()
    requests[1].error(new Error('Synthetic refresh failure'))
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('m-dashboard-metrics-widget')).toBe(content)
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'ultimi valori caricati'
    )
    fixture.nativeElement.querySelector('button').click()
    fixture.detectChanges()
    respond(dashboardProfile({ personalMoleculeCount: 4 }))
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull()
    expect(fixture.nativeElement.querySelector('dl dd')?.textContent.trim()).toBe('7')
  })

  it('does not start a queued realtime request after navigating away', async () => {
    TestBed.inject(DomainInvalidationService).publish({
      domain: 'profile',
      action: 'changed',
      remote: true,
    })
    fixture.detectChanges()
    fixture.destroy()
    await Promise.resolve()
    expect(load).toHaveBeenCalledTimes(1)
    expect(requests[0].observed).toBeFalse()
  })
})
