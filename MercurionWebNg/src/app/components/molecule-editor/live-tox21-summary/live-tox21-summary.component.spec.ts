import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { Tooltip } from 'primeng/tooltip'

import type { T1PredictionDTO } from '../../../Models/notebook/t1-prediction-model'
import { LiveTox21SummaryComponent } from './live-tox21-summary.component'

describe('LiveTox21SummaryComponent', () => {
  let fixture: ComponentFixture<LiveTox21SummaryComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveTox21SummaryComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(LiveTox21SummaryComponent)
  })

  it('renders the four selected endpoints in deterministic order', () => {
    const inference: T1PredictionDTO = {
      'SR-ATAD5': { probability: 0.1, threshold: 0.5, is_positive: false },
      'NR-AhR': { probability: 0.8, threshold: 0.5, is_positive: true },
      'SR-MMP': { probability: 0.2, threshold: 0.5, is_positive: false },
      'SR-p53': { probability: 0.3, threshold: 0.5, is_positive: false }
    }

    fixture.componentRef.setInput('inference', inference)
    fixture.detectChanges()

    const text = fixture.nativeElement.textContent as string
    expect(text.indexOf('SR-ATAD5')).toBeLessThan(text.indexOf('NR-AhR'))
    expect(text.indexOf('NR-AhR')).toBeLessThan(text.indexOf('SR-MMP'))
    expect(text.indexOf('SR-MMP')).toBeLessThan(text.indexOf('SR-p53'))
    expect(text).toContain('Positivo')
    expect(text).toContain('Negativo')
    expect(fixture.nativeElement.querySelectorAll('dt').length).toBe(4)
    expect(text).toContain('Probabilità')
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-label')).toContain('soglie')
  })

  it('offers thresholds and model limitations through the information button on focus and tap', fakeAsync(() => {
    fixture.componentRef.setInput('inference', { 'SR-ATAD5': { probability: 0.1, threshold: 0.55, is_positive: false } })
    fixture.detectChanges()
    const button = fixture.debugElement.query(By.directive(Tooltip))
    const tooltip = button.injector.get(Tooltip)
    expect(tooltip.tooltipEvent).toBe('focus')
    button.nativeElement.click()
    tick(1)
    fixture.detectChanges()
    const bubble = document.querySelector('[role="tooltip"]')
    expect(bubble?.textContent).toMatch(/55[.,]00\s*%/)
    expect(bubble?.textContent).toContain('non dimostra che la molecola sia sicura')
    expect(document.getElementById(button.nativeElement.getAttribute('aria-describedby'))).not.toBeNull()
    tooltip.deactivate()
  }))

  it('shows zero as a value and explains partial results without displaying invalid probabilities', () => {
    fixture.componentRef.setInput('inference', {
      'SR-ATAD5': { probability: 0, threshold: 0.5, is_positive: false },
      'NR-AhR': { probability: NaN, threshold: 0.5, is_positive: false }
    })
    fixture.detectChanges()
    const text = fixture.nativeElement.textContent as string
    expect(text).toContain('1 di 4 endpoint')
    expect(text).toMatch(/0[.,]00\s*%/)
    expect(text).not.toContain('NaN')
    expect(text).toContain('Non disponibile')
    expect(fixture.nativeElement.querySelectorAll('li').length).toBe(4)
  })

  it('keeps the results geometry stable across loading, partial data, errors and empty state', () => {
    fixture.nativeElement.style.cssText = 'display:block;width:320px'
    fixture.componentRef.setInput('inference', { 'SR-ATAD5': { probability: 0, threshold: 0.5, is_positive: false } })
    const heights: number[] = []
    for (const state of ['partial', 'loading', 'error', 'empty']) {
      fixture.componentRef.setInput('loading', state === 'loading')
      fixture.componentRef.setInput('error', state === 'error')
      if (state === 'empty') fixture.componentRef.setInput('inference', null)
      fixture.detectChanges()
      heights.push(fixture.nativeElement.getBoundingClientRect().height)
      expect(fixture.nativeElement.querySelectorAll('li').length).toBe(4)
    }
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1)
  })
})
