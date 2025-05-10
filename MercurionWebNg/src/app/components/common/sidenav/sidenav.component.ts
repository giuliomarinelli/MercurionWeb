import { Component, HostListener, AfterViewInit, computed, signal } from '@angular/core'
import { SidenavContextService } from '../../../services/stores/sidenav-context.service'
import { LayoutContextService } from '../../../services/stores/layout-context.service'
import { ViewportRuler } from '@angular/cdk/scrolling'

@Component({
  selector: 'app-sidenav',
  standalone: true,
  template: `
   @if (sidenavContext.isMounted()) {
    <aside
      class="fixed left-0 z-40 w-64 bg-gray-900 text-white transition-transform duration-300 ease-in-out"
      [style.top.px]="headerHeight()"
      [style.height.px]="contentHeight()"
      [class.-translate-x-full]="!sidenavContext.isVisible()"
      [class.translate-x-0]="sidenavContext.isVisible()"
    >
      <!-- Contenuto -->
    </aside>
   }
  `
})
export class SidenavComponent implements AfterViewInit {

  // altezza viewport (signal che emette su resize)
  viewportHeight = signal(this.getViewportHeight())

  // *** nuovo: signal computed per l’altezza header ***
  headerHeight = computed(() => this.layoutContext.headerHeight())

  // height del contenuto = viewport - header
  contentHeight = computed(() =>
    this.viewportHeight() - this.headerHeight()
  )

  @HostListener('window:resize')
  onResize() {
    this.viewportHeight.set(this.getViewportHeight())
  }

  constructor(
    protected readonly sidenavContext: SidenavContextService,
    protected readonly layoutContext: LayoutContextService,
    private readonly viewportRuler: ViewportRuler
  ) {}

  ngAfterViewInit() {
    // assicura una prima misura corretta quando l’header è già renderizzato
    queueMicrotask(() => this.viewportHeight.set(this.getViewportHeight()))
  }

  getViewportHeight() {
    return this.viewportRuler.getViewportSize().height
  }
}
