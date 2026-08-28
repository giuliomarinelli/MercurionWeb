import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { UserContextService } from '../../services/context/user-context.service';
import { AppContextService } from '../../services/context/app-context.service';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'm-forbidden-403-landing.page',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

    <main class="absolute inset-0 z-[50] grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8 dark:bg-gray-950" aria-labelledby="forbidden-heading">
      <div class="text-center">
        <p class="text-5xl font-semibold text-light-accent-primary-hc dark:text-dark-accent-primary-btn">403</p>
        <h1 id="forbidden-heading" class="mt-4 text-balance text-5xl font-semibold tracking-tight text-gray-900 sm:text-7xl dark:text-white">Accesso non consentito.</h1>
        <p class="mt-6 text-pretty text-lg font-medium text-gray-700 sm:text-xl/8 dark:text-gray-300">Siamo spiacenti, ma non disponi dei permessi per accedere alla pagina o al contenuto che cercavi.</p>
        <div class="mt-10 flex items-center justify-center gap-x-6">
          <button (click)="goBack()" class="text-sm font-semibold text-gray-900 dark:text-white"><span aria-hidden="true">&larr;</span> Torna indietro</button>
          <button (click)="goHome()" class="rounded-md bg-light-accent-primary-hq px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-light-accent-primary-hc focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-accent-primary-hq dark:bg-dark-accent-primary-btn dark:hover:bg-blue-400/85 dark:focus-visible:outline-indigo-500 transition-colors duration-300">
            {{ homeContent() }}
          </button>
        </div>
      </div>
    </main>


  `
})
export class Forbidden403LandingPageComponent {


  private readonly userContext = inject(UserContextService)
  private readonly location = inject(Location)
  private readonly appContext = inject(AppContextService)
  private readonly router = inject(Router)

  protected homeContent = computed<string>(() => this.userContext.isLoggedIn() ? 'Vai alla Dashboard' : 'Vai alla Home')
  protected homePath = computed<string>(() => this.userContext.isLoggedIn() ? '/dashboard' : '/')

  goBack(): void {
    queueMicrotask(() => this.location.back())
  }

  goHome(): void {
    queueMicrotask(() => {
      this.appContext.notifyAdded()
      this.router.navigateByUrl(this.homePath())
    })
  }

}
