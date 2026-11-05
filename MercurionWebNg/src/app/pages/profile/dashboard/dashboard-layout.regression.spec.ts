import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { DashboardMetricsWidgetComponent } from './dashboard-metrics-widget.component'
import { DashboardChartsWidgetComponent } from './dashboard-charts-widget.component'
import { DashboardLoadingComponent } from './dashboard-loading.component'
import { ThemeManagerService } from '../../../services/context/theme-manager.service'
import { dashboardProfile } from './dashboard.testing'
import { toMetricsViewModel, toWorkspaceCompositionViewModel } from './dashboard-widget.mappers'

// Compare independently rendered skeletons and real cards with the browser's layout engine.
describe('Dashboard responsive geometry', () => {
  let fixtures: ComponentFixture<unknown>[]
  let frame: HTMLIFrameElement

  afterEach(() => {
    fixtures?.forEach((fixture) => fixture.destroy())
    frame?.remove()
  })

  for (const width of [320, 375, 768, 1280]) {
    for (const theme of ['light', 'dark'] as const) {
      it(`keeps cards and skeletons aligned at ${width}px in ${theme}`, async () => {
        await TestBed.configureTestingModule({
          imports: [
            DashboardMetricsWidgetComponent,
            DashboardChartsWidgetComponent,
            DashboardLoadingComponent,
          ],
          providers: [{ provide: ThemeManagerService, useValue: { theme: signal(theme) } }],
        }).compileComponents()
        frame = document.createElement('iframe')
        frame.style.cssText = `width:${width}px;height:900px;border:0;display:block`
        document.body.appendChild(frame)
        const doc = frame.contentDocument!
        doc.documentElement.classList.toggle('dark', theme === 'dark')
        const style = doc.createElement('style')
        style.textContent = Array.from(document.styleSheets)
          .flatMap((sheet) => Array.from(sheet.cssRules).map((rule) => rule.cssText))
          .join('\n')
        doc.head.appendChild(style)
        doc.body.style.margin = '0'
        const loading = TestBed.createComponent(DashboardLoadingComponent)
        const metrics = TestBed.createComponent(DashboardMetricsWidgetComponent)
        const charts = TestBed.createComponent(DashboardChartsWidgetComponent)
        fixtures = [loading, metrics, charts]
        const profile = dashboardProfile()
        metrics.componentRef.setInput('metrics', toMetricsViewModel(profile))
        charts.componentRef.setInput('composition', toWorkspaceCompositionViewModel(profile))
        charts.componentRef.setInput('activity', [
          { dayLabel: '27/10', molecules: 3, collections: 1 },
        ])
        for (const fixture of fixtures) {
          doc.body.appendChild(fixture.nativeElement)
          fixture.detectChanges()
        }
        await charts.whenStable()
        charts.detectChanges()

        const boxes = (root: HTMLElement, selector: string) =>
          Array.from(root.querySelectorAll(selector)).map((element) =>
            element.getBoundingClientRect()
          )
        const stableHeight = (placeholder: DOMRect[], content: DOMRect[]) => {
          expect(content.length).toBe(placeholder.length)
          content.forEach((box, index) => {
            expect(Math.abs(box.height - placeholder[index].height))
              .withContext(`${width}px: card ${index}`)
              .toBeLessThanOrEqual(1)
            expect(Math.abs(box.width - placeholder[index].width))
              .withContext(`${width}px: card width ${index}`)
              .toBeLessThanOrEqual(1)
          })
        }
        stableHeight(
          boxes(loading.nativeElement, '[data-dashboard-heading]'),
          boxes(metrics.nativeElement, '[data-dashboard-heading]')
        )
        stableHeight(
          boxes(loading.nativeElement, '[data-dashboard-metric]'),
          boxes(metrics.nativeElement, '[data-dashboard-metric]')
        )
        stableHeight(
          boxes(loading.nativeElement, '[data-dashboard-chart]'),
          boxes(charts.nativeElement, '[data-dashboard-chart]')
        )
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(doc.documentElement.clientWidth)
        const plot = charts.nativeElement.querySelector('canvas').getBoundingClientRect()
        expect(plot.height).toBeGreaterThanOrEqual(190)
        expect(plot.height).toBeLessThanOrEqual(194)
        expect(plot.width).toBeGreaterThan(100)
        for (const node of doc.querySelectorAll('button, summary, canvas, dt, dd, h1, h2')) {
          const box = node.getBoundingClientRect()
          expect(box.left)
            .withContext(node.textContent ?? node.tagName)
            .toBeGreaterThanOrEqual(-1)
          expect(box.right)
            .withContext(node.textContent ?? node.tagName)
            .toBeLessThanOrEqual(doc.documentElement.clientWidth + 1)
        }
        metrics.componentRef.setInput(
          'metrics',
          toMetricsViewModel(
            dashboardProfile({
              firstName: 'Un nome composto particolarmente lungo',
              personalMoleculeCount: 1234567,
              chemblMoleculeCount: 9876543,
              collectionCount: 456789,
            })
          )
        )
        metrics.detectChanges()
        expect(doc.documentElement.scrollWidth)
          .withContext('long name and large counters')
          .toBeLessThanOrEqual(doc.documentElement.clientWidth)
        expect(metrics.nativeElement.textContent).toContain('1.234.567')
        const chartBoxes = boxes(charts.nativeElement, '[data-dashboard-chart]')
        if (width >= 1280) {
          expect(chartBoxes[0].top).toBeCloseTo(chartBoxes[1].top, 0)
          expect(chartBoxes[1].left).toBeGreaterThan(chartBoxes[0].right)
        }
        if (width === 1280) {
          // Resize already-created canvases before Chart.js receives ResizeObserver callbacks.
          frame.style.width = '320px'
          expect(doc.documentElement.scrollWidth)
            .withContext('no transient overflow when narrowing an existing chart')
            .toBeLessThanOrEqual(doc.documentElement.clientWidth)
          frame.style.width = `${width}px`
          await new Promise<void>((resolve) =>
            doc.defaultView!.requestAnimationFrame(() => resolve())
          )
        }
        charts.componentRef.setInput('composition', {
          labels: ['Molecole personali', 'Molecole ChEMBL', 'Collezioni'],
          values: [0, 0, 0],
        })
        charts.componentRef.setInput('activity', [])
        charts.detectChanges()
        await charts.whenStable()
        stableHeight(chartBoxes, boxes(charts.nativeElement, '[data-dashboard-chart]'))
      })
    }
  }
})
