import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { SidenavContextService } from '../../services/context/sidenav-context.service';
import { DashboardChartsWidgetComponent } from './dashboard/dashboard-charts-widget.component';
import { DashboardFacade } from './dashboard/dashboard.facade';
import { DashboardMetricsWidgetComponent } from './dashboard/dashboard-metrics-widget.component';

@Component({
  selector: 'm-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ClassicSpinnerComponent,
    DashboardMetricsWidgetComponent,
    DashboardChartsWidgetComponent
  ],
  providers: [DashboardFacade],
  template: `
    <section
      #mainHost
      class="main-container py-8 cursor-default"
      role="main"
      aria-live="polite"
      [attr.aria-busy]="facade.state().status === 'loading'">
      @if (facade.state().status === 'content' && facade.state().value; as dashboard) {
        <div class="mx-auto max-w-5xl grid gap-8
                    lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
          <m-dashboard-metrics-widget [metrics]="dashboard.metrics" />
          @defer (on viewport) {
            <m-dashboard-charts-widget
              [composition]="dashboard.composition"
              [activity]="dashboard.activity" />
          } @placeholder {
            <div class="h-[260px] rounded-lg border border-slate-300/70 dark:border-slate-700/70"
                 aria-label="Caricamento grafici"></div>
          }
        </div>
      } @else if (facade.state().status === 'loading') {
        <div class="fixed inset-0 pointer-events-none">
          <div
            class="fixed top-1/2 -translate-y-1/2"
            [style.left.px]="spinnerLeft()"
            role="status"
            aria-live="polite">
            <m-classic-spinner [size]="60" />
          </div>
        </div>
      } @else if (facade.state().status === 'error') {
        <p class="text-light-error dark:text-dark-error" role="alert">
          Si è verificato un errore nel caricamento della dashboard.
        </p>
      }
    </section>
  `
})
export class DashboardPageComponent implements AfterViewInit, OnDestroy {
  readonly facade = inject(DashboardFacade);
  private readonly sidenavContext = inject(SidenavContextService);
  readonly mainHost = viewChild<ElementRef<HTMLElement>>('mainHost');
  readonly spinnerLeft = signal(0);
  private resizeObserver?: ResizeObserver;

  constructor() {
    this.sidenavContext.isOpen();
  }

  ngAfterViewInit(): void {
    this.updateSpinnerLeft();
    const host = this.mainHost()?.nativeElement;
    if (host) {
      this.resizeObserver = new ResizeObserver(() => this.updateSpinnerLeft());
      this.resizeObserver.observe(host);
    }
    window.addEventListener('resize', this.updateSpinnerLeft);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.updateSpinnerLeft);
  }

  private updateSpinnerLeft = (): void => {
    const rect = this.mainHost()?.nativeElement.getBoundingClientRect();
    if (rect) this.spinnerLeft.set(rect.left + rect.width / 2);
  };
}
