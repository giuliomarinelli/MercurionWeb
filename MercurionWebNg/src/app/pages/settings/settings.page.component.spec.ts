import { ElementRef } from '@angular/core'
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { Event as RouterEvent, NavigationEnd, Router, Scroll, provideRouter } from '@angular/router'
import { Subject } from 'rxjs'
import { ScrollContextService } from '../../services/context/scroll-context.service'
import { SettingsPageComponent } from './settings.page.component'
import { SettingsAccountFacade } from './settings-account.facade'
import { SettingsSecurityFacade } from './settings-security.facade'

describe('SettingsPageComponent', () => {
  let component: SettingsPageComponent
  let fixture: ComponentFixture<SettingsPageComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsPageComponent],
      providers: [provideRouter([])],
    })
      .overrideComponent(SettingsPageComponent, {
        set: {
          providers: [
            {
              provide: SettingsAccountFacade,
              useValue: {
                loading: () => false,
                profile: () => null,
                version: () => null,
                authProvider: () => null,
                isSso: () => false,
                load: () => undefined,
              },
            },
            {
              provide: SettingsSecurityFacade,
              useValue: {
                load: () => undefined,
                sessions: () => [],
                enabledMfa: () => false,
                strategies: () => [],
              },
            },
          ],
        },
      })
      .compileComponents()

    fixture = TestBed.createComponent(SettingsPageComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('keeps panel loading deferred until a section is expanded', () => {
    expect(component.expandedIndex()).toBeNull()
    expect(fixture.nativeElement.querySelector('m-settings-security-panel')).toBeNull()
  })

  it('finds each disclosure host for smooth section navigation', () => {
    expect(component.disclosureItemHosts().length).toBe(4)
    expect(fixture.nativeElement.querySelectorAll('m-disclosure button svg').length).toBe(8)
  })

  it('realigns a direct section link after router scroll restoration', fakeAsync(() => {
    const scrolling = TestBed.inject(ScrollContextService)
    scrolling.registerScrollRootRef(new ElementRef(document.documentElement))
    const smooth = spyOn(scrolling, 'smoothTo')
    component.expandedIndex.set(2)
    fixture.detectChanges()
    tick(350)
    smooth.calls.reset()

    const router = TestBed.inject(Router)
    ;(router.events as Subject<RouterEvent>).next(
      new Scroll(new NavigationEnd(1, '/settings#contact_details', '/settings#contact_details'), null, 'contact_details'),
    )
    tick(350)
    expect(smooth).toHaveBeenCalled()
  }))
})
