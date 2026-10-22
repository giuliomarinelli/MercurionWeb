import { inject, Injectable, InjectionToken, signal } from '@angular/core'
import { firstValueFrom, Observable, Subscriber, timeout } from 'rxjs'
import { AuthStateStore } from '../services/auth-state.store'
import { BrowserStorageRegistry, storageDescriptor } from '../services/browser-storage-registry'

export const EDITOR_REQUEST_LOCKS = new InjectionToken<LockManager | undefined>('EDITOR_REQUEST_LOCKS', {
  providedIn: 'root', factory: () => globalThis.navigator?.locks
})

const BUDGET = storageDescriptor<string>('moleculeEditorRequestBudget')
const WINDOW_MS = 300_000
const MAX_REQUESTS = 200
const LOCK_WAIT_MS = 15_000
export interface EditorRequestWaiting {
  kind: 'queued' | 'lock' | 'cooldown'
  resumeAt: number
}
interface Bucket { sent: number[]; until: number }
interface Job {
  route: string
  priority: number
  attempt: number
  eligibleAt: number
  subscriber: Subscriber<unknown>
  request: () => Observable<unknown>
  session: string | undefined
  abort: AbortController
  phase: EditorRequestWaiting['kind'] | 'request'
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

/** Apollo wraps HttpErrorResponse in networkError; REST exposes it directly. */
export function editorRetryDelay(error: unknown, attempt: number, now = Date.now()): number | null {
  if (attempt >= 3) return null
  const outer = record(error)
  const network = record(outer['networkError'] ?? error)
  let body = network['error']
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const graphErrors = outer['graphQLErrors']
  const extension = Array.isArray(graphErrors) ? record(record(graphErrors[0])['extensions']) : {}
  const code = record(body)['code'] ?? extension['code'] ?? outer['code']
  const status = network['status'] ?? network['statusCode'] ?? extension['status']
  if (code === 'SCIENTIFIC_RPC_OVERLOADED') return 500 * 2 ** attempt
  if (status === 429 || code === 'RATE_LIMITED') {
    const headers = network['headers'] as { get?: (name: string) => string | null } | undefined
    const retryAfter = headers?.get?.('Retry-After')
    if (retryAfter) {
      const seconds = Number(retryAfter)
      const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - now
      if (Number.isFinite(delay)) return Math.max(1000, delay)
    }
    // Unknown HTTP quota: do not hammer the endpoint when headers are unavailable.
    return WINDOW_MS
  }
  if (status === 0 || status === 502 || status === 503 || status === 504 || outer['name'] === 'TimeoutError' ||
      code === 'TOX21_TIMEOUT' || code === 'SCIENTIFIC_RPC_UNAVAILABLE') return 1000 * 2 ** attempt
  return null
}

/**
 * Editor reads share the server's scientific capacity. Unsubscribing discards
 * a result but NEVER aborts an admitted request and releases its slot early.
 * Web Locks serialize tabs; only timestamps/cooldowns are persisted, no molecules.
 */
@Injectable({ providedIn: 'root' })
export class EditorRequestScheduler {
  private readonly locks = inject(EDITOR_REQUEST_LOCKS)
  private readonly storage = inject(BrowserStorageRegistry)
  private readonly auth = inject(AuthStateStore)
  private readonly jobs: Job[] = []
  private busy = false
  private timer?: ReturnType<typeof setTimeout>
  private active?: Job
  readonly waiting = signal<EditorRequestWaiting | null>(null)

  run<T>(route: string, request: () => Observable<T>, priority = 0): Observable<T> {
    return new Observable<T>(subscriber => {
      const job: Job = {
        route, priority, request, subscriber: subscriber as Subscriber<unknown>,
        attempt: 0, eligibleAt: 0, session: this.auth.clientSession()?.sessionId,
        abort: new AbortController(), phase: 'queued'
      }
      this.jobs.push(job)
      this.pump()
      return () => { job.abort.abort(); this.publishWaiting(); this.pump() }
    })
  }

  private pump(): void {
    this.publishWaiting()
    if (this.busy) return
    clearTimeout(this.timer)
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      const job = this.jobs[i]
      if (job.subscriber.closed || job.session !== this.auth.clientSession()?.sessionId) {
        this.jobs.splice(i, 1)
        job.subscriber.complete()
      }
    }
    this.jobs.sort((a, b) => a.priority - b.priority)
    const index = this.jobs.findIndex(job => job.eligibleAt <= Date.now())
    if (index < 0) {
      if (this.jobs.length) this.timer = setTimeout(() => this.pump(), Math.max(1, Math.min(...this.jobs.map(j => j.eligibleAt)) - Date.now()))
      return
    }
    const [job] = this.jobs.splice(index, 1)
    this.busy = true
    this.active = job
    void this.dispatch(job).finally(() => { this.active = undefined; this.busy = false; this.pump() })
  }

  private async dispatch(job: Job): Promise<void> {
    let admissionTimer: ReturnType<typeof setTimeout> | undefined
    let admissionExpired = false
    try {
      if (!this.locks) throw new Error('Il browser non supporta il coordinamento delle richieste dell’editor.')
      job.phase = 'lock'
      this.publishWaiting()
      const admissionDeadline = new Promise<never>((_resolve, reject) => {
        admissionTimer = setTimeout(() => {
          admissionExpired = true
          job.abort.abort()
          reject(new Error('Attesa di un’altra scheda scaduta. Riprova quando la scheda ha terminato.'))
        }, LOCK_WAIT_MS)
      })
      await Promise.race([this.locks.request('mercurion-molecule-editor-requests', { signal: job.abort.signal }, async () => {
        clearTimeout(admissionTimer)
        if (job.abort.signal.aborted || job.subscriber.closed || job.session !== this.auth.clientSession()?.sessionId) return
        const buckets = this.readBuckets()
        const bucket = buckets[job.route] ?? { sent: [], until: 0 }
        const now = Date.now()
        bucket.sent = bucket.sent.filter(time => time > now - WINDOW_MS)
        const eligible = Math.max(bucket.until, bucket.sent.length >= MAX_REQUESTS ? bucket.sent[0] + WINDOW_MS : 0)
        if (eligible > now) {
          job.eligibleAt = eligible
          job.phase = 'cooldown'
          this.jobs.push(job)
          this.publishWaiting()
          return
        }
        bucket.sent.push(now)
        buckets[job.route] = bucket
        this.storage.set(BUDGET, JSON.stringify(buckets))
        job.phase = 'request'
        this.publishWaiting()
        try {
          // Keep transport subscribed even if the consumer switches revision.
          const value = await firstValueFrom(job.request().pipe(timeout(15_000)))
          if (job.session === this.auth.clientSession()?.sessionId) job.subscriber.next(value)
          job.subscriber.complete()
        } catch (error) {
          // Exhausting this consumer's retries must not discard a server quota
          // cooldown: subsequent consumers still have to respect Retry-After.
          const delay = editorRetryDelay(error, Math.min(job.attempt, 2))
          if (delay !== null) {
            job.eligibleAt = Date.now() + delay + Math.floor(Math.random() * 100)
            // Also retain cooldown when the consumer was cancelled, so replacing
            // the structure does not reset backpressure or a route quota.
            const latest = this.readBuckets()
            latest[job.route] = { sent: latest[job.route]?.sent ?? bucket.sent, until: job.eligibleAt }
            this.storage.set(BUDGET, JSON.stringify(latest))
            if (!job.subscriber.closed && job.attempt < 3) {
              job.attempt++
              job.phase = 'cooldown'
              this.jobs.push(job)
              this.publishWaiting()
            } else job.subscriber.error(error)
          } else job.subscriber.error(error)
        }
      }), admissionDeadline])
    } catch (error) {
      if (!job.subscriber.closed) job.subscriber.error(admissionExpired
        ? new Error('Attesa di un’altra scheda scaduta. Riprova quando la scheda ha terminato.') : error)
    } finally {
      clearTimeout(admissionTimer)
    }
  }

  private publishWaiting(): void {
    const relevant = [...(this.active ? [this.active] : []), ...this.jobs]
      .filter(job => !job.subscriber.closed && job.session === this.auth.clientSession()?.sessionId)
      .sort((a, b) => a.priority - b.priority)
    const job = relevant[0]
    this.waiting.set(job && job.phase !== 'request' ? { kind: job.phase, resumeAt: job.eligibleAt } : null)
  }

  private readBuckets(): Record<string, Bucket> {
    try {
      const value = record(JSON.parse(this.storage.get(BUDGET) ?? '{}'))
      const buckets: Record<string, Bucket> = {}
      for (const [route, candidate] of Object.entries(value)) {
        const item = record(candidate)
        if (Array.isArray(item['sent']) && item['sent'].every(t => typeof t === 'number' && Number.isFinite(t)) &&
            typeof item['until'] === 'number' && Number.isFinite(item['until'])) {
          buckets[route] = { sent: item['sent'], until: item['until'] }
        }
      }
      return buckets
    } catch { return {} }
  }
}
