import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { getTestBed, TestBed } from '@angular/core/testing'
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing'
import { provideRouter } from '@angular/router'
import { Apollo } from 'apollo-angular'
import { NEVER } from 'rxjs'

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting(),
  {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true
  }
)

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      {
        provide: Apollo,
        useValue: {
          mutate: jasmine.createSpy('Apollo.mutate').and.returnValue(NEVER),
          query: jasmine.createSpy('Apollo.query').and.returnValue(NEVER),
          watchQuery: jasmine.createSpy('Apollo.watchQuery').and.returnValue({
            valueChanges: NEVER,
            refetch: jasmine.createSpy('Apollo.watchQuery.refetch')
          })
        }
      }
    ]
  })
})
