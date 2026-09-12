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
      class="absolute inset-0 z-[50] grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8 dark:bg-gray-950"
      tabindex="-1"
      [attr.aria-labelledby]="headingId"
      [attr.aria-describedby]="descriptionId"
    >
      <div class="text-center">
        <p class="text-5xl font-semibold text-light-accent-primary-hc dark:text-dark-accent-primary-btn" role="status" aria-live="polite">
          {{ status().code }}
        </p>
        <h1 [id]="headingId" class="mt-4 text-balance text-5xl font-semibold tracking-tight text-gray-900 sm:text-7xl dark:text-white">
          {{ status().heading }}
        </h1>
        <p [id]="descriptionId" class="mt-6 text-pretty text-lg font-medium text-gray-700 sm:text-xl/8 dark:text-gray-300">
          {{ status().description }}
        </p>
        <div class="mt-10 flex items-center justify-center gap-x-6">
          <m-button variant="ghost" size="sm" (pressed)="goBack()">
            <span aria-hidden="true">&larr;</span> Torna indietro
          </m-button>
          <m-button variant="primary" (pressed)="goHome()">
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
    queueMicrotask(() => this.statusPage().nativeElement.focus())
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
