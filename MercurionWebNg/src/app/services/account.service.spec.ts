import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { firstValueFrom } from 'rxjs'
import { AccountService } from './account.service'
import { AuthStateStore, type AuthenticatedClientSession } from './auth-state.store'
import { PROVIDED_EMAIL_CACHE_CLOCK } from './provided-email-cache.tokens'

describe('AccountService provided-email cache', () => {
  let service: AccountService
  let http: HttpTestingController
  let now: number
  let activeSession: ReturnType<typeof signal<AuthenticatedClientSession | null>>

  const session = (userId: string, sessionId: string): AuthenticatedClientSession => ({
    userId,
    sessionId,
    initials: userId.slice(0, 2).toUpperCase(),
    scopes: [],
    accessToken: 'access',
    wsAccessToken: 'ws',
    wsTokenIssuedAt: 0
  })

  beforeEach(() => {
    now = 1_000
    activeSession = signal<AuthenticatedClientSession | null>(session('user-a', 'session-a'))
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthStateStore,
          useValue: { clientSession: activeSession.asReadonly() }
        },
        { provide: PROVIDED_EMAIL_CACHE_CLOCK, useValue: () => now }
      ]
    })
    service = TestBed.inject(AccountService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  const flushEmail = (email: string) => {
    http.expectOne('/api/account/email').flush({ email, provider: 'Mercurion' })
  }

  it('hits once while the active owner and finite TTL are valid', async () => {
    const first = firstValueFrom(service.getProvidedEmail())
    flushEmail('a@example.test')
    await expectAsync(first).toBeResolvedTo({ email: 'a@example.test', provider: 'Mercurion' })

    await expectAsync(firstValueFrom(service.getProvidedEmail())).toBeResolvedTo({
      email: 'a@example.test',
      provider: 'Mercurion'
    })

    now += AccountService.PROVIDED_EMAIL_CACHE_TTL_MS
    const expired = firstValueFrom(service.getProvidedEmail())
    flushEmail('a-fresh@example.test')
    await expectAsync(expired).toBeResolvedTo({ email: 'a-fresh@example.test', provider: 'Mercurion' })
  })

  it('does not reuse data after logout or session replacement', async () => {
    const first = firstValueFrom(service.getProvidedEmail())
    flushEmail('a@example.test')
    await first

    activeSession.set(null)
    const anonymous = firstValueFrom(service.getProvidedEmail())
    flushEmail('anonymous@example.test')
    await anonymous

    activeSession.set(session('user-b', 'session-b'))
    const replacement = firstValueFrom(service.getProvidedEmail())
    flushEmail('b@example.test')
    await expectAsync(replacement).toBeResolvedTo({ email: 'b@example.test', provider: 'Mercurion' })
  })

  it('invalidates after a successful email mutation', async () => {
    const first = firstValueFrom(service.getProvidedEmail())
    flushEmail('old@example.test')
    await first

    const mutation = firstValueFrom(service.changeEmail_secondStep('123456', 'secure'))
    http.expectOne('/api/account/email/2').flush({ confirmed: true })
    await mutation

    const refreshed = firstValueFrom(service.getProvidedEmail())
    flushEmail('new@example.test')
    await expectAsync(refreshed).toBeResolvedTo({ email: 'new@example.test', provider: 'Mercurion' })
  })

  it('ignores a late response started by the previous session', async () => {
    const oldRequest = firstValueFrom(service.getProvidedEmail())
    const old = http.expectOne('/api/account/email')

    activeSession.set(session('user-b', 'session-b'))
    const newRequest = firstValueFrom(service.getProvidedEmail())
    const current = http.expectOne('/api/account/email')
    current.flush({ email: 'b@example.test', provider: 'Mercurion' })
    await newRequest
    old.flush({ email: 'a@example.test', provider: 'Mercurion' })
    await oldRequest

    await expectAsync(firstValueFrom(service.getProvidedEmail())).toBeResolvedTo({
      email: 'b@example.test',
      provider: 'Mercurion'
    })
  })
})
