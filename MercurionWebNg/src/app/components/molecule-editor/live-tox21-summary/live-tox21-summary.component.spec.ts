import { ComponentFixture, TestBed } from '@angular/core/testing'

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
  })
})
