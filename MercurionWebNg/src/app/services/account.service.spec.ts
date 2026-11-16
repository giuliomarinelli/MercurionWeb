import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { firstValueFrom } from 'rxjs'
import { AccountService } from './account.service'
import { AuthStateStore, type AuthenticatedClientSession } from './auth-state.store'
import { PROVIDED_ACCOUNT_ID_CACHE_CLOCK } from './provided-email-cache.tokens'

describe('AccountService provided-account-id cache', () => {
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
        { provide: PROVIDED_ACCOUNT_ID_CACHE_CLOCK, useValue: () => now }
      ]
    })
    service = TestBed.inject(AccountService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  const flushAccountId = (accountId: string) => {
    http.expectOne('/api/account/provided-account-id').flush({ accountId, kind: 'email', provider: 'Mercurion' })
  }

  it('hits once while the active owner and finite TTL are valid', async () => {
    const first = firstValueFrom(service.getProvidedAccountId())
    flushAccountId('a@example.test')
    await expectAsync(first).toBeResolvedTo({ accountId: 'a@example.test', kind: 'email', provider: 'Mercurion' })

    await expectAsync(firstValueFrom(service.getProvidedAccountId())).toBeResolvedTo({
      accountId: 'a@example.test',
      kind: 'email',
      provider: 'Mercurion'
    })

    now += AccountService.PROVIDED_EMAIL_CACHE_TTL_MS
    const expired = firstValueFrom(service.getProvidedAccountId())
    flushAccountId('a-fresh@example.test')
    await expectAsync(expired).toBeResolvedTo({ accountId: 'a-fresh@example.test', kind: 'email', provider: 'Mercurion' })
  })

  it('coalesces concurrent reads for the active owner', async () => {
    const first = firstValueFrom(service.getProvidedAccountId())
    const second = firstValueFrom(service.getProvidedAccountId())

    flushAccountId('a@example.test')

    await expectAsync(first).toBeResolvedTo({ accountId: 'a@example.test', kind: 'email', provider: 'Mercurion' })
    await expectAsync(second).toBeResolvedTo({ accountId: 'a@example.test', kind: 'email', provider: 'Mercurion' })
  })

  it('does not reuse data after logout or session replacement', async () => {
    const first = firstValueFrom(service.getProvidedAccountId())
    flushAccountId('a@example.test')
    await first

    activeSession.set(null)
    const anonymous = firstValueFrom(service.getProvidedAccountId())
    flushAccountId('anonymous@example.test')
    await anonymous

    activeSession.set(session('user-b', 'session-b'))
    const replacement = firstValueFrom(service.getProvidedAccountId())
    flushAccountId('b@example.test')
    await expectAsync(replacement).toBeResolvedTo({ accountId: 'b@example.test', kind: 'email', provider: 'Mercurion' })
  })

  it('invalidates after a successful email mutation', async () => {
    const first = firstValueFrom(service.getProvidedAccountId())
    flushAccountId('old@example.test')
    await first

    const mutation = firstValueFrom(service.changeEmail_secondStep('123456', 'secure'))
    http.expectOne('/api/account/email/2').flush({ confirmed: true })
    await mutation

    const refreshed = firstValueFrom(service.getProvidedAccountId())
    flushAccountId('new@example.test')
    await expectAsync(refreshed).toBeResolvedTo({ accountId: 'new@example.test', kind: 'email', provider: 'Mercurion' })
  })

  it('ignores a late response started by the previous session', async () => {
    const oldRequest = firstValueFrom(service.getProvidedAccountId())
    const old = http.expectOne('/api/account/provided-account-id')

    activeSession.set(session('user-b', 'session-b'))
    const newRequest = firstValueFrom(service.getProvidedAccountId())
    const current = http.expectOne('/api/account/provided-account-id')
    current.flush({ accountId: 'b@example.test', kind: 'email', provider: 'Mercurion' })
    await newRequest
    old.flush({ accountId: 'a@example.test', kind: 'email', provider: 'Mercurion' })
    await oldRequest

    await expectAsync(firstValueFrom(service.getProvidedAccountId())).toBeResolvedTo({
      accountId: 'b@example.test',
      kind: 'email',
      provider: 'Mercurion'
    })
  })
})
