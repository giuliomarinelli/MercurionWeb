import { provideHttpClient } from '@angular/common/http'
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { firstValueFrom } from 'rxjs'

import { NotificationApiService } from './notification-api.service'

describe('NotificationApiService', () => {
  let service: NotificationApiService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    service = TestBed.inject(NotificationApiService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('requests incremental recovery with the opaque cursor', async () => {
    const pending = firstValueFrom(service.recover('n1.MTI', 50))
    const request = http.expectOne(req =>
      req.url === '/api/notifications/recovery' &&
      req.params.get('cursor') === 'n1.MTI' &&
      req.params.get('limit') === '50'
    )

    expect(request.request.withCredentials).toBeTrue()
    request.flush({
      cursor: 'n1.MTM',
      snapshotAt: '2026-10-02T20:00:00.000Z',
      unreadCount: 1,
      unseenCount: 1,
      changes: [],
      hasMore: false
    })

    await pending
  })

  it('sends the visible recovery boundary with dismiss-all', async () => {
    const pending = firstValueFrom(service.dismissAll('n1.MTI'))
    const request = http.expectOne('/api/notifications')

    expect(request.request.method).toBe('DELETE')
    expect(request.request.body).toEqual({ throughCursor: 'n1.MTI' })
    request.flush(null)

    await pending
  })
})
