import { Component, inject, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { LandingPage } from './landing.page'
import httpErrorPages from './data/http-error-pages.json' assert { type: 'json' }
import { HttpErrorPage } from './Models/http-error-page.model'
import { LandingPageConfig } from './Models/landing-page.config.model'


@Component({
  selector: '#factory',
  standalone: true,
  imports: [LandingPage],
  template: `
    <main
      class="absolute inset-0 z-50 grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8 dark:bg-gray-950"
      [config]="config"
    ></main>
  `
})
export class Factory implements OnInit {

  private readonly route = inject(ActivatedRoute)

  private readonly httpErrorPages: HttpErrorPage[] = httpErrorPages as HttpErrorPage[]

  protected config!: LandingPageConfig

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('code') ?? '404'
    const parsed = Number(raw)
    const code = Number.isFinite(parsed) ? parsed : 404

    const page = this.fetchErrorByCode(code)

    this.config = {
      code: String(page.code),
      title: page.error,
      description: page.description,
      primaryCtaLabel: 'Vai alla Home',
      primaryCtaHref: '/'
    }
  }

  private fetchErrorByCode(code: number): HttpErrorPage {
    return (
      this.httpErrorPages.find((e) => e.code === code) ??
      this.httpErrorPages.find((e) => e.code === 404)!
    )
  }
}
