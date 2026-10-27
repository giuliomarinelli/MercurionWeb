import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { signal } from '@angular/core'
import { of, Subject } from 'rxjs'
import { Tooltip } from 'primeng/tooltip'
import { By } from '@angular/platform-browser'
import { SensitiveDataChangeWorkflowComponent } from './sensitive-data-change-workflow.component'
import { SensitiveDataChangeFacade } from './sensitive-data-change-facade.service'
import { SensitiveDataChangeContextService } from '../../../services/context/action-context/sensitive-data-change-context.service'
import { CountryService } from '../../../services/country.service'

describe('Sensitive phone Italian prefix', () => {
  let fixture: ComponentFixture<SensitiveDataChangeWorkflowComponent>
  let request: jasmine.Spy

  beforeEach(async () => {
    request = jasmine.createSpy('changePhoneFirstStep').and.returnValue(new Subject())
    await TestBed.configureTestingModule({
      imports: [SensitiveDataChangeWorkflowComponent],
      providers: [
        {
          provide: SensitiveDataChangeContextService,
          useValue: { innerScope: signal('AddPhone') },
        },
        {
          provide: SensitiveDataChangeFacade,
          useValue: {
            getMaskedAccountId: () => of('a***@example.test'),
            getMaskedPhone: () => of(null),
            changePhoneFirstStep: request,
          },
        },
        {
          provide: CountryService,
          useValue: {
            getAllPhonePrefixes: () =>
              of([
                { id: 43, iso2: 'US', phonecode: '+1', emojiUrl: '/flags/us.svg' },
                { id: 42, iso2: 'IT', phonecode: '+39', emojiUrl: '/flags/it.svg' },
              ]),
          },
        },
      ],
    }).compileComponents()
    fixture = TestBed.createComponent(SensitiveDataChangeWorkflowComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  })

  it('displays the Italian flag and prefix from the returned country, with a locked select', () => {
    const select: HTMLButtonElement = fixture.nativeElement.querySelector('m-select button')
    expect(select.disabled).toBeTrue()
    expect(select.textContent).toContain('IT +39')
    expect(select.querySelector('img')?.getAttribute('src')).toContain('/flags/it.svg')
    expect(fixture.componentInstance.phoneForm.controls.prefix.disabled).toBeTrue()
    expect(fixture.componentInstance.phoneForm.controls.prefix.value).toBe(42)
    select.click()
    fixture.detectChanges()
    expect(document.querySelector('[role="listbox"]')).toBeNull()
    expect(fixture.nativeElement.textContent).toContain(
      'Sono accettati solo numeri italiani (+39).'
    )
  })

  it('provides the explanation on keyboard focus and hover outside the disabled control', fakeAsync(() => {
    const host = fixture.debugElement.query(By.directive(Tooltip))
    expect(host).not.toBeNull()
    if (!host) return
    const wrapper = host.nativeElement as HTMLElement
    expect(wrapper.tabIndex).toBe(0)
    expect(wrapper.getAttribute('aria-describedby')).toContain('settings-phone-country-note')
    wrapper.focus()
    tick()
    const tooltip = document.querySelector('[role="tooltip"]') as HTMLElement
    expect(tooltip.classList.contains('m-navigation-tooltip')).toBeTrue()
    const bubble = tooltip.querySelector('.p-tooltip-text') as HTMLElement
    expect(getComputedStyle(bubble).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain(
      'solo numeri italiani'
    )
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    wrapper.blur()
    tick()
    wrapper.dispatchEvent(new MouseEvent('mouseenter'))
    tick()
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain(
      'solo numeri italiani'
    )
    wrapper.dispatchEvent(new MouseEvent('mouseleave'))
    tick()
  }))

  it('sends the fixed prefix with the entered number through the real workflow', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="tel"]')
    input.value = '3123456789'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    fixture.detectChanges()
    const submit: HTMLButtonElement = fixture.nativeElement.querySelector(
      'm-button[action-footer-primary] button'
    )
    expect(submit.disabled).toBeFalse()
    submit.click()
    expect(request).toHaveBeenCalledOnceWith('+39', '3123456789')
  })

  it('anchors the tooltip to the control when the overlay freezes a scrolled body', fakeAsync(() => {
    const previousStyle = document.body.style.cssText
    try {
      document.body.style.position = 'fixed'
      document.body.style.top = '-200px'
      document.body.style.width = '100%'
      const wrapper = fixture.debugElement.query(By.directive(Tooltip)).nativeElement as HTMLElement
      wrapper.focus()
      tick()
      const bubble = document.querySelector('[role="tooltip"]') as HTMLElement
      expect(Math.abs(bubble.getBoundingClientRect().bottom - wrapper.getBoundingClientRect().top))
        .withContext('body offset must not be applied twice to the tooltip')
        .toBeLessThanOrEqual(2)
      wrapper.blur()
      tick()
    } finally {
      document.body.style.cssText = previousStyle
    }
  }))
})
