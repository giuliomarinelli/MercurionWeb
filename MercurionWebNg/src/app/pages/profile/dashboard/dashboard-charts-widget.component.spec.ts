import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { Chart } from 'chart.js'
import { DashboardChartsWidgetComponent } from './dashboard-charts-widget.component'
import { ThemeManagerService } from '../../../services/context/theme-manager.service'

const composition = {
  labels: ['Molecole personali', 'Molecole ChEMBL', 'Collezioni'],
  values: [2, 3, 4],
}
const activity = [
  { dayLabel: '26/10', molecules: 2, collections: 1 },
  { dayLabel: '27/10', molecules: 0, collections: 3 },
]

describe('Dashboard charts and accessible data', () => {
  let fixture: ComponentFixture<DashboardChartsWidgetComponent>
  let theme: WritableSignal<'light' | 'dark'>

  beforeEach(async () => {
    theme = signal<'light' | 'dark'>('light')
    await TestBed.configureTestingModule({
      imports: [DashboardChartsWidgetComponent],
      providers: [{ provide: ThemeManagerService, useValue: { theme } }],
    }).compileComponents()
    fixture = TestBed.createComponent(DashboardChartsWidgetComponent)
  })

  async function render(comp = composition, points = activity) {
    fixture.componentRef.setInput('composition', comp)
    fixture.componentRef.setInput('activity', points)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  function charts() {
    return Array.from(
      fixture.nativeElement.querySelectorAll('canvas') as NodeListOf<HTMLCanvasElement>
    ).map((canvas) => Chart.getChart(canvas)!)
  }

  it('renders the actual chart datasets and exact visible counts, without requiring hover', async () => {
    await render()
    expect(charts().length).toBe(2)
    expect(charts().every(Boolean)).toBeTrue()
    expect(charts()[0].data.datasets[0].data).toEqual([2, 3, 4])
    expect(charts()[1].data.datasets.map((dataset) => dataset.data)).toEqual([
      [2, 0],
      [1, 3],
    ])
    expect(
      Array.from(fixture.nativeElement.querySelectorAll('dl dd') as NodeListOf<HTMLElement>).map(
        (cell) => cell.textContent?.trim()
      )
    ).toEqual(['2', '3', '4'])
    const rows = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>
    )
    expect(
      rows.map((row) =>
        Array.from(row.querySelectorAll('th, td')).map((cell) => cell.textContent?.trim())
      )
    ).toEqual([
      ['26/10', '2', '1'],
      ['27/10', '0', '3'],
    ])
    expect(fixture.nativeElement.querySelector('summary')?.textContent).toContain(
      'Dati giorno per giorno'
    )
    expect(fixture.nativeElement.textContent).toContain('una volta al giorno')
  })

  it('toggles the real doughnut and bar datasets through native accessible buttons', async () => {
    await render()
    const originalCharts = charts()
    const compositionButton: HTMLButtonElement = fixture.nativeElement.querySelector('dl button')
    compositionButton.click()
    fixture.detectChanges()
    await fixture.whenStable()
    expect(originalCharts[0].getDataVisibility(0)).toBeFalse()
    expect(compositionButton.getAttribute('aria-pressed')).toBe('false')
    expect(charts()[0]).toBe(originalCharts[0])
    const activityButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[aria-label="Serie del grafico attività"] button'
    )
    activityButton.click()
    fixture.detectChanges()
    expect(originalCharts[1].isDatasetVisible(0)).toBeFalse()
    expect(activityButton.getAttribute('aria-pressed')).toBe('false')
    activityButton.click()
    fixture.detectChanges()
    expect(originalCharts[1].isDatasetVisible(0)).toBeTrue()
  })

  it('updates both charts for theme and data changes, preserving chosen series visibility', async () => {
    await render()
    const first = charts()
    fixture.nativeElement.querySelector('dl button').click()
    theme.set('dark')
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(charts()[0]).not.toBe(first[0])
    expect(charts()[0].getDataVisibility(0)).toBeFalse()
    expect(charts()[0].data.datasets[0].backgroundColor).toEqual(['#22c55e', '#0ea5e9', '#a855f7'])
    await render({ ...composition, values: [5, 6, 7] })
    expect(charts()[0].data.datasets[0].data).toEqual([5, 6, 7])
    expect(first[0].canvas).toBeNull()
  })

  it('renders independent empty states instead of empty or misleading canvases', async () => {
    await render(
      { ...composition, values: [0, 0, 0] },
      activity.map((point) => ({ ...point, molecules: 0, collections: 0 }))
    )
    expect(charts().length).toBe(0)
    expect(fixture.nativeElement.querySelector('#dashboard-empty-heading')?.textContent).toContain(
      'workspace è pronto'
    )
    expect(fixture.nativeElement.querySelector('a[href="/molecules"]')).not.toBeNull()
    expect(fixture.nativeElement.textContent).toContain('Nessuna attività')
    await render({ ...composition, values: [0, 0, 0] })
    expect(charts().length).toBe(1)
    expect(charts()[0].data.datasets[0].label).toBe('Molecole')
  })

  it('destroys both Chart.js instances when navigating away', async () => {
    await render()
    const canvases = Array.from(
      fixture.nativeElement.querySelectorAll('canvas') as NodeListOf<HTMLCanvasElement>
    )
    fixture.destroy()
    expect(canvases.every((canvas) => !Chart.getChart(canvas))).toBeTrue()
  })
})
