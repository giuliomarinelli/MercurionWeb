import { Component, computed, Input } from '@angular/core';
import { LandingPageConfig } from './Models/landing-page.config.model';

@Component({
  selector: 'main',
  imports: [],
  template: `
    <div class="text-center">
      <p
        class="text-5xl font-semibold text-[#0f3b99] dark:text-[#0b6de5]"
      >
        {{ vm().code }}
      </p>
      <h1
        class="mt-4 text-balance text-5xl font-semibold tracking-tight text-gray-900 sm:text-7xl dark:text-white"
      >
        {{ vm().title }}
      </h1>
      <p
        class="mt-6 text-pretty text-lg font-medium text-gray-700 sm:text-xl/8 dark:text-gray-400"
      >
        {{ vm().description }}
      </p>
      <div class="mt-10 flex items-center justify-center gap-x-6">
        <button
          type="button"
          id="go-back-btn"
          class="landing-btn cursor-pointer text-sm font-semibold text-gray-900 dark:text-white"
        >
          <span aria-hidden="true">&larr;</span>
          Torna indietro
        </button>
        <button
          type="button"
          id="go-home-btn"
          class="landing-btn cursor-pointer rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm bg-[#0f3b99] hover:bg-[#1147bb] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#0f3b99] dark:bg-[#0b6de5] dark:hover:bg-blue-400/85 dark:focus-visible:outline-indigo-500 transition-colors duration-300"
        >
          {{ vm().primaryCtaLabel }}
        </button>
      </div>
    </div>
  `,
})
export class LandingPage {
  // Config opzionale dall’esterno (SSR / factory / route data ecc.)
  @Input()
  config?: LandingPageConfig

  // ViewModel finale: merge tra config esterna e default interni
  protected readonly vm = computed(() => {

    const cfg = this.config ?? {}

    return {
      code: cfg.code ?? '404',
      title: cfg.title ?? 'Pagina non trovata.',
      description:
        cfg.description ??
        'Siamo spiacenti, ma non siamo riusciti a trovare la pagina o il contenuto che cercavi.',
      primaryCtaLabel: cfg.primaryCtaLabel ?? 'Vai alla Home',
      primaryCtaHref: cfg.primaryCtaHref ?? '/',
    }
  })

}
