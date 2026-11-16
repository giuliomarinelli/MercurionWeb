import { DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { AppComponent } from './app.component'
import { AppShellFacade } from './services/app-shell.facade'
import { SearchContextService } from './services/context/search-context.service'
import { RealtimeStateSyncService } from './services/realtime-state-sync.service'

describe('Deferred search overlay feedback', () => {
  it('shows cancellable loading and an explicit module error', async () => {
    TestBed.configureTestingModule({
      imports: [AppComponent], deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        { provide: AppShellFacade, useValue: { routePolicy: signal({ shell: 'home' }) } },
        { provide: RealtimeStateSyncService, useValue: { start: () => undefined, stop: () => undefined } },
      ],
    })
    const context = TestBed.inject(SearchContextService)
    context.open()
    await new Promise(resolve => setTimeout(resolve, 20))
    const fixture = TestBed.createComponent(AppComponent)
    fixture.detectChanges()
    const blocks = await fixture.getDeferBlocks()
    const search = blocks[0]
    await search.render(DeferBlockState.Loading)
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('m-deferred-overlay-state [role="status"]')?.textContent).toContain('Caricamento pannello')
    await search.render(DeferBlockState.Error)
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Non è stato possibile')
    const reload = spyOn(fixture.componentInstance as unknown as { reloadPage(): void }, 'reloadPage')
    const buttons = [...fixture.nativeElement.querySelectorAll('m-deferred-overlay-state button')] as HTMLButtonElement[]
    buttons.find(button => button.textContent?.includes('Ricarica'))!.click()
    expect(reload).toHaveBeenCalledTimes(1)
    buttons.find(button => button.getAttribute('aria-label') === 'Chiudi pannello')!.click()
    expect(context.isOpenedSearchOverlay()).toBeFalse()
  })
})
