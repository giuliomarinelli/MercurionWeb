import { Location } from '@angular/common'
import { ChangeDetectionStrategy, Component, ElementRef, AfterViewInit, inject, computed, viewChild } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { ButtonComponent } from '../../components/common/button/button.component'
import { UserContextService } from '../../services/context/user-context.service'
import { routeManifest } from '../../route-manifest'
import { StatusPageConfig } from './status-page.models'

@Component({
  selector: 'm-status-page',
  standalone: true,
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      #statusPage
      class="main-container grid min-h-[min(32rem,70dvh)] place-items-center py-8 text-on-surface-main outline-none sm:py-12"
      tabindex="-1"
      [attr.aria-labelledby]="headingId"
      [attr.aria-describedby]="descriptionId"
    >
      <div class="w-full max-w-2xl text-center">
        <p class="text-4xl font-semibold text-light-accent-primary-hc dark:text-dark-accent-primary-btn" role="status" aria-live="polite">
          {{ status().code }}
        </p>
        <h1 [id]="headingId" class="mt-4 text-balance text-3xl font-semibold tracking-tight text-on-surface-main sm:text-5xl">
          {{ status().heading }}
        </h1>
        <p [id]="descriptionId" class="mt-5 text-pretty text-base leading-7 text-on-surface-secondary sm:text-lg">
          {{ status().description }}
        </p>
        <div class="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <m-button size="lg" variant="outline" (pressed)="goBack()">
            <span aria-hidden="true">&larr;</span> Torna indietro
          </m-button>
          <m-button size="lg" variant="primary" (pressed)="goHome()">
            {{ homeContent() }}
          </m-button>
        </div>
      </div>
    </main>
  `,
})
export class StatusPageComponent implements AfterViewInit {
  private readonly route = inject(ActivatedRoute)
  private readonly userContext = inject(UserContextService)
  private readonly location = inject(Location)
  private readonly router = inject(Router)
  private readonly statusPage = viewChild.required<ElementRef<HTMLElement>>('statusPage')

  protected readonly headingId = 'status-page-heading'
  protected readonly descriptionId = 'status-page-description'
  protected readonly status = computed<StatusPageConfig>(() => {
    const config = this.route.snapshot.data['statusPage'] as StatusPageConfig | undefined
    if (!config) {
      throw new Error('Status page route is missing its typed statusPage configuration')
    }
    return config
  })
  protected readonly homeContent = computed(() => this.userContext.isLoggedIn() ? 'Vai alla Dashboard' : 'Vai alla Home')

  ngAfterViewInit(): void {
    queueMicrotask(() => this.statusPage().nativeElement.focus({ preventScroll: true }))
  }

  goBack(): void {
    queueMicrotask(() => {
      if (window.history.length > 1) {
        this.location.back()
      } else {
        this.goHome()
      }
    })
  }

  goHome(): void {
    queueMicrotask(() => {
      const destination = this.userContext.isLoggedIn()
        ? routeManifest.dashboard.build({})
        : routeManifest.home.build({})
      void this.router.navigateByUrl(destination)
    })
  }
}
