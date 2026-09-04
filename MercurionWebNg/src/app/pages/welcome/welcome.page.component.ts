import { WelcomeHeroComponent } from './../../components/welcome/welcome-hero/welcome-hero.component'
import { ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core'
import { FooterComponent } from '../../components/common/footer/footer.component'
import { WelcomeCloudLogoComponent } from '../../components/welcome/welcome-cloud-logo/welcome-cloud-logo.component'
import { WelcomeFeatureGridComponent } from '../../components/welcome/welcome-feature-grid/welcome-feature-grid.component'
import { WelcomeScreenshotBandComponent } from '../../components/welcome/welcome-screenshot-band/welcome-screenshot-band.component'
import { WelcomeSecondaryFeaturesComponent } from '../../components/welcome/welcome-secondary-features/welcome-secondary-features.component'
import { Subscription } from 'rxjs'
import { AppContextService } from '../../services/context/app-context.service'
import { ActivatedRoute } from '@angular/router'
import { UserContextService } from '../../services/context/user-context.service'
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component'
import { DesignService } from '../../services/design.service'

@Component({
  selector: 'm-welcome-page',
  imports: [
    WelcomeHeroComponent,
    WelcomeCloudLogoComponent,
    WelcomeFeatureGridComponent,
    WelcomeScreenshotBandComponent,
    WelcomeSecondaryFeaturesComponent,
    FooterComponent,
    ClassicSpinnerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host {
      display: block;
      position: relative;
    }

    /* Layer di background con le molecole */
    .mercurion-bg-layer {
      position: fixed;
      inset: 0;
      z-index: -1;           /* sempre sotto nav, menu, modali, ecc. */
      pointer-events: none;  /* non intercetta click del menu tema */
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      background-image: url('/welcome/bg-light.jpg');
    }

    /* Variante dark: cambia solo l'immagine */
    :host-context(.dark) .mercurion-bg-layer {
      background-image: url('/welcome/bg-dark.jpg');
    }

    /* Velo leggero per aumentare il contrasto del contenuto */
    .mercurion-bg-overlay {
      position: fixed;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      /* Light: riduciamo il velo scuro per far emergere il pattern */
      background:
        radial-gradient(circle at 20% 0, rgba(15,23,42,0.18) 0, transparent 52%),
        radial-gradient(circle at 80% 100%, rgba(15,23,42,0.25) 0, transparent 60%);
    }

    :host-context(.dark) .mercurion-bg-overlay {
      /* Dark invariato: overlay più intenso per il testo chiaro */
      background:
        radial-gradient(circle at top, rgba(15,23,42,0.32) 0, transparent 55%),
        radial-gradient(circle at bottom, rgba(15,23,42,0.55) 0, transparent 65%);
    }

    /* Shell della pagina (sopra il background) */
    .mercurion-page-shell {
      min-height: 100vh;
      background-color: rgba(248,250,252,0.55); /* slate-50 con alpha più leggera per far risaltare il bg */
      color: #020617;
    }

    :host-context(.dark) .mercurion-page-shell {
      background-color: rgba(2,6,23,0.87);      /* neutral-950 con alpha */
      color: #e5e7eb;
    }
  `],

  template: `
    <div>
      <!-- Background molecolare (dietro a tutto) -->
      <div class="mercurion-bg-layer"></div>
      <div class="mercurion-bg-overlay"></div>
      @if (userContext.isLoggedIn()) {
        <main class="mercurion-page-shell flex justify-center items-center h-full">
          @if (design.maxBk('md')()) {
            <m-classic-spinner [size]="30" />
          } @else if (design.minBk('md')()) {
            <m-classic-spinner [size]="60" />
          }
        </main>
      } @else {
      <!-- Contenuto della pagina -->
        <main class="mercurion-page-shell">
          <!-- Hero section -->
          <m-welcome-hero />
          <!-- Logo cloud -->
          <m-welcome-cloud-logo />
          <!-- Feature section -->
          <m-welcome-feature-grid />
          <!-- Screenshot section -->
          <m-welcome-screenshot-band />
          <!-- Feature secondary -->
          <m-welcome-secondary-features />
          <!-- Footer -->
          <m-footer />
        </main>
      }
    </div>
  ` })
export class WelcomePageComponent {

  private readonly route = inject(ActivatedRoute)
  private readonly appContext = inject(AppContextService)
  protected readonly userContext = inject(UserContextService)
  protected readonly design = inject(DesignService)

  private fragSub?: Subscription

  ngOnInit(): void {
    this.fragSub = this.route.fragment.subscribe((frag) => {

      if (!frag) {
        return
      }

      const target = document.getElementById(frag)
      if (!target) {
        return
      }

      const rootEl = document.documentElement

      const y = this.appContext.getScrollYRelativeToRoot(target, rootEl) - 85
      const hostRef = new ElementRef<HTMLElement>(rootEl)

      this.appContext.smoothTo(hostRef, y, 240)
    })
  }

  ngOnDestroy(): void {
    this.fragSub?.unsubscribe()
  }

}
