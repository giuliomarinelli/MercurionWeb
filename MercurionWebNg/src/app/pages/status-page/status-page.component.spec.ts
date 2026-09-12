import { Location } from '@angular/common'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router } from '@angular/router'
import { UserContextService } from '../../services/context/user-context.service'
import { StatusPageComponent } from './status-page.component'
import { STATUS_PAGE_CONFIG } from './status-page.models'

class UserContextStub {
  isLoggedIn(): boolean {
    return false
  }
}

class LocationStub {
  back(): void {}
}

class RouterStub {
  readonly destinations: string[] = []

  navigateByUrl(url: string): Promise<boolean> {
    this.destinations.push(url)
    return Promise.resolve(true)
  }
}

describe('StatusPageComponent', () => {
  let fixture: ComponentFixture<StatusPageComponent>
  let router: RouterStub

  async function createFor(config: typeof STATUS_PAGE_CONFIG[403] | typeof STATUS_PAGE_CONFIG[404]): Promise<void> {
    router = new RouterStub()
    await TestBed.configureTestingModule({
      imports: [StatusPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data: { statusPage: config } } } },
        { provide: UserContextService, useClass: UserContextStub },
        { provide: Location, useClass: LocationStub },
        { provide: Router, useValue: router },
      ],
    }).compileComponents()

    fixture = TestBed.createComponent(StatusPageComponent)
    fixture.detectChanges()
  }

  it('renders the distinct 403 copy and anonymous home CTA', async () => {
    await createFor(STATUS_PAGE_CONFIG[403])

    expect(fixture.nativeElement.textContent).toContain('403')
    expect(fixture.nativeElement.textContent).toContain('Accesso non consentito.')
    expect(fixture.nativeElement.textContent).toContain('Vai alla Home')
  })

  it('renders the distinct 404 copy', async () => {
    await createFor(STATUS_PAGE_CONFIG[404])

    expect(fixture.nativeElement.textContent).toContain('404')
    expect(fixture.nativeElement.textContent).toContain('Pagina non trovata.')
  })

  it('uses the manifest home destination for the primary CTA', async () => {
    await createFor(STATUS_PAGE_CONFIG[404])

    const button = fixture.nativeElement.querySelectorAll('button')[1] as HTMLButtonElement
    button.click()
    await Promise.resolve()

    expect(router.destinations).toEqual(['/'])
  })
})
