import { DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing'
import { of } from 'rxjs'
import { DashboardPageComponent } from './dashboard.page.component'
import { AccountService } from '../../services/account.service'
import { dashboardProfile } from './dashboard/dashboard.testing'

describe('Dashboard deferred chart errors', () => {
  it('retains counters and chart geometry when the deferred module fails', async () => {
    TestBed.configureTestingModule({ imports: [DashboardPageComponent], deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [{ provide: AccountService, useValue: { getProfileRegistry: () => of(dashboardProfile()) } }],
    })
    const fixture = TestBed.createComponent(DashboardPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    const blocks = await fixture.getDeferBlocks()
    const before = fixture.nativeElement.querySelector('m-dashboard-charts-placeholder').getBoundingClientRect().height
    await blocks[0].render(DeferBlockState.Error)
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelectorAll('[data-dashboard-metric]').length).toBe(4)
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('modulo dei grafici')
    const after = fixture.nativeElement.querySelector('m-dashboard-charts-placeholder').getBoundingClientRect().height
    expect(Math.abs(after - before)).toBeLessThanOrEqual(1)
    const reload = spyOn(fixture.componentInstance as unknown as { reloadPage(): void }, 'reloadPage')
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((item: unknown) => (item as HTMLButtonElement).textContent?.includes('Ricarica')) as HTMLButtonElement
    button.click()
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
