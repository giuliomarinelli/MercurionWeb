import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap } from '@angular/router'
import { Meta, Title } from '@angular/platform-browser'
import { afterEach, describe, expect, it } from 'vitest'
import { Factory } from './m-factory'

describe('HTTP error page factory', () => {
  const initialTitle = document.title
  const initialDescription = document.querySelector('meta[name="description"]')?.getAttribute('content')
  const initialRobots = document.querySelector('meta[name="robots"]')?.getAttribute('content')

  afterEach(() => {
    TestBed.resetTestingModule()
    document.title = initialTitle
    for (const [name, content] of [['description', initialDescription], ['robots', initialRobots]] as const) {
      document.querySelector(`meta[name="${name}"]`)?.remove()
      if (content != null) {
        const element = document.createElement('meta')
        element.name = name
        element.content = content
        document.head.appendChild(element)
      }
    }
  })

  for (const [code, expected] of [['400', '400'], ['invalid', '404'], ['999', '404'], [null, '404']] as const) {
    it(`renders ${expected} and metadata for route code ${code}`, async () => {
      await TestBed.configureTestingModule({
        imports: [Factory],
        providers: [{ provide: ActivatedRoute, useValue: {
          snapshot: { paramMap: convertToParamMap(code === null ? {} : { code }) },
        } }],
      }).compileComponents()
      const fixture = TestBed.createComponent(Factory)
      fixture.detectChanges()
      await fixture.whenStable()

      const root = fixture.nativeElement as HTMLElement
      expect(root.querySelector('main p')?.textContent?.trim()).toBe(expected)
      const heading = root.querySelector('h1')?.textContent?.trim()
      expect(heading).toBeTruthy()
      expect(TestBed.inject(Title).getTitle()).toBe(`Mercurion — ${expected} ${heading}`)
      expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('noindex, nofollow')
      expect(TestBed.inject(Meta).getTag('name="description"')?.content).toBeTruthy()
    })
  }
})
