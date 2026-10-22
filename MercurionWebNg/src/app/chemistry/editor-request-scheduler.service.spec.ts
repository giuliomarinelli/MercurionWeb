import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing'
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http'
import { of, Subject, throwError } from 'rxjs'
import { AuthStateStore } from '../services/auth-state.store'
import { BrowserStorageRegistry } from '../services/browser-storage-registry'
import { EDITOR_REQUEST_LOCKS, EditorRequestScheduler, editorRetryDelay } from './editor-request-scheduler.service'

describe('Editor request admission and recovery', () => {
  let scheduler: EditorRequestScheduler
  let sessionId: string
  let budget: string | null
  let lockRequest: jasmine.Spy
  beforeEach(() => {
    sessionId = 'session-a'
    budget = null
    lockRequest = jasmine.createSpy('lockRequest').and.callFake((_: string, options: LockOptions, fn: () => Promise<void>) =>
      options.signal?.aborted ? Promise.reject(new Error('aborted')) : fn())
    TestBed.configureTestingModule({ providers: [
      { provide: AuthStateStore, useValue: { clientSession: () => ({ sessionId }) } },
      { provide: BrowserStorageRegistry, useValue: { get: () => budget, set: (_: unknown, value: string) => { budget = value } } },
      { provide: EDITOR_REQUEST_LOCKS, useValue: { request: lockRequest } }
    ] })
    scheduler = TestBed.inject(EditorRequestScheduler)
    spyOn(Math, 'random').and.returnValue(0)
  })

  it('bounds admission wait and never starts a timed-out callback even if it arrives late', fakeAsync(() => {
    let late: (() => Promise<void>) | undefined
    lockRequest.and.callFake((_: string, _options: LockOptions, fn: () => Promise<void>) => {
      late = fn
      return new Promise<void>(() => undefined)
    })
    const request = jasmine.createSpy().and.returnValue(of('old'))
    const failed = jasmine.createSpy()
    scheduler.run('rest', request).subscribe({ error: failed })
    expect(scheduler.waiting()?.kind).toBe('lock')
    tick(14999); expect(failed).not.toHaveBeenCalled()
    tick(1); flushMicrotasks()
    expect(failed).toHaveBeenCalledTimes(1)
    expect(scheduler.waiting()).toBeNull()
    void late?.(); flushMicrotasks()
    expect(request).not.toHaveBeenCalled()
    lockRequest.and.callFake((_: string, _options: LockOptions, fn: () => Promise<void>) => fn())
    scheduler.run('rest', request).subscribe(); flushMicrotasks()
    expect(request).toHaveBeenCalledTimes(1)
  }))

  it('exposes quota pause and resume time and clears waiting when work is admitted', fakeAsync(() => {
    const resumeAt = Date.now() + 5000
    budget = JSON.stringify({ rest: { sent: [], until: resumeAt } })
    const request = jasmine.createSpy().and.returnValue(of('CC'))
    scheduler.run('rest', request).subscribe(); flushMicrotasks()
    expect(scheduler.waiting()).toEqual({ kind: 'cooldown', resumeAt })
    tick(4999); expect(request).not.toHaveBeenCalled()
    tick(1); flushMicrotasks()
    expect(request).toHaveBeenCalledTimes(1)
    expect(scheduler.waiting()).toBeNull()
  }))

  it('cancels a lock waiter without errors or late transport work', fakeAsync(() => {
    let late: (() => Promise<void>) | undefined
    lockRequest.and.callFake((_: string, options: LockOptions, fn: () => Promise<void>) => {
      late = fn
      return new Promise<void>((_resolve, reject) => options.signal?.addEventListener('abort', () => reject(new Error('aborted'))))
    })
    const request = jasmine.createSpy().and.returnValue(of('CC'))
    const failed = jasmine.createSpy()
    const subscription = scheduler.run('rest', request).subscribe({ error: failed })
    subscription.unsubscribe(); flushMicrotasks()
    void late?.(); flushMicrotasks(); tick(15000)
    expect(request).not.toHaveBeenCalled()
    expect(failed).not.toHaveBeenCalled()
    expect(scheduler.waiting()).toBeNull()
  }))

  it('keeps admitted work alive after unsubscribe and sends only the latest pending request', fakeAsync(() => {
    const active = new Subject<string>()
    const old = scheduler.run('rest', () => active).subscribe()
    const obsolete = jasmine.createSpy().and.returnValue(of('obsolete'))
    const queued = scheduler.run('rest', obsolete).subscribe()
    const latest = jasmine.createSpy().and.returnValue(of('latest'))
    scheduler.run('rest', latest).subscribe()
    old.unsubscribe(); queued.unsubscribe(); flushMicrotasks()
    expect(active.observed).toBeTrue()
    expect(latest).not.toHaveBeenCalled()
    active.next('old'); active.complete(); flushMicrotasks()
    expect(obsolete).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledTimes(1)
  }))

  it('recovers the unchanged request after scientific overload without waiting for HTTP reset', fakeAsync(() => {
    let calls = 0
    const result = jasmine.createSpy()
    scheduler.run('rest', () => ++calls === 1 ? throwError(() => new HttpErrorResponse({
      status: 429, error: { code: 'SCIENTIFIC_RPC_OVERLOADED' }, headers: new HttpHeaders({ 'X-RateLimit-Reset': '287' })
    })) : of('CC')).subscribe(result)
    flushMicrotasks(); tick(499); expect(calls).toBe(1)
    tick(1); flushMicrotasks()
    expect(calls).toBe(2); expect(result).toHaveBeenCalledWith('CC')
  }))

  it('respects HTTP Retry-After and stops automatically retrying after three retries', fakeAsync(() => {
    let calls = 0
    const failed = jasmine.createSpy()
    scheduler.run('graphql', () => { calls++; return throwError(() => new HttpErrorResponse({ status: 429,
      headers: new HttpHeaders({ 'Retry-After': '2' }) })) }).subscribe({ error: failed })
    flushMicrotasks(); tick(1999); expect(calls).toBe(1)
    tick(1); flushMicrotasks(); tick(2000); flushMicrotasks(); tick(2000); flushMicrotasks()
    expect(calls).toBe(4); expect(failed).toHaveBeenCalledTimes(1)
  }))

  it('bounds the rolling route budget and does not block a different eligible route', fakeAsync(() => {
    budget = JSON.stringify({ graphql: { sent: Array(200).fill(Date.now()), until: 0 } })
    const query = jasmine.createSpy().and.returnValue(of('name'))
    const sub = scheduler.run('graphql', query).subscribe()
    const canonical = jasmine.createSpy().and.returnValue(of('CC'))
    scheduler.run('rest', canonical).subscribe()
    flushMicrotasks(); expect(query).not.toHaveBeenCalled(); expect(canonical).toHaveBeenCalled()
    tick(299999); expect(query).not.toHaveBeenCalled()
    tick(1); flushMicrotasks(); expect(query).toHaveBeenCalledTimes(1)
    sub.unsubscribe()
  }))

  it('retains the route cooldown after the last failed retry', fakeAsync(() => {
    scheduler.run('graphql', () => throwError(() => new HttpErrorResponse({ status: 429,
      headers: new HttpHeaders({ 'Retry-After': '2' }) }))).subscribe({ error: () => undefined })
    flushMicrotasks()
    for (let retry = 0; retry < 3; retry++) { tick(2000); flushMicrotasks() }
    const next = jasmine.createSpy().and.returnValue(of('next'))
    scheduler.run('graphql', next).subscribe(); flushMicrotasks()
    tick(1999); expect(next).not.toHaveBeenCalled()
    tick(1); flushMicrotasks(); expect(next).toHaveBeenCalledTimes(1)
  }))

  it('preserves overload cooldown when the failing input was replaced', fakeAsync(() => {
    const active = new Subject<string>()
    const stale = scheduler.run('rest', () => active).subscribe()
    stale.unsubscribe()
    const next = jasmine.createSpy().and.returnValue(of('new'))
    scheduler.run('rest', next).subscribe()
    active.error(new HttpErrorResponse({ status: 429, error: { code: 'SCIENTIFIC_RPC_OVERLOADED' } }))
    flushMicrotasks(); tick(499); expect(next).not.toHaveBeenCalled()
    tick(1); flushMicrotasks(); expect(next).toHaveBeenCalledTimes(1)
  }))

  it('does not publish a response or dispatch queued work after session replacement', fakeAsync(() => {
    const active = new Subject<string>()
    const result = jasmine.createSpy()
    scheduler.run('rest', () => active).subscribe(result)
    const next = jasmine.createSpy().and.returnValue(of('next'))
    scheduler.run('rest', next).subscribe()
    sessionId = 'session-b'; active.next('private'); active.complete(); flushMicrotasks()
    expect(result).not.toHaveBeenCalled(); expect(next).not.toHaveBeenCalled()
  }))

  it('classifies Apollo wrapped overload and never retries invalid structures or forbidden requests', () => {
    expect(editorRetryDelay({ networkError: { status: 429, error: JSON.stringify({ code: 'SCIENTIFIC_RPC_OVERLOADED' }) } }, 0)).toBe(500)
    expect(editorRetryDelay({ graphQLErrors: [{ extensions: { code: 'SCIENTIFIC_RPC_OVERLOADED' } }] }, 1)).toBe(1000)
    expect(editorRetryDelay({ status: 400 }, 0)).toBeNull()
    expect(editorRetryDelay({ status: 403 }, 0)).toBeNull()
  })
})
