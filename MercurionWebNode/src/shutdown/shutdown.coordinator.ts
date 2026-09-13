export type ShutdownState = 'running' | 'draining' | 'closed'

export type ShutdownReason =
  | { kind: 'signal'; signal: 'SIGTERM' | 'SIGINT' }
  | { kind: 'fatal'; error: unknown }

export interface ShutdownResource {
  readonly name: string
  close(): void | Promise<void>
}

export interface ShutdownLogger {
  log(...messages: (string | object)[]): void
  warn(...messages: (string | object)[]): void
}

export interface ShutdownResult {
  readonly timedOut: boolean
  readonly failures: readonly { resource: string; error: unknown }[]
}

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000

export class ShutdownCoordinator {
  private stateValue: ShutdownState = 'running'
  private shutdownPromise: Promise<ShutdownResult> | undefined

  constructor(
    private readonly resources: readonly ShutdownResource[],
    private readonly timeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS,
    private readonly logger: ShutdownLogger = console
  ) {}

  get state(): ShutdownState {
    return this.stateValue
  }

  shutdown(reason: ShutdownReason): Promise<ShutdownResult> {
    if (this.shutdownPromise) return this.shutdownPromise

    this.stateValue = 'draining'
    this.logger.log('[SHUTDOWN_START]', {
      reason: reason.kind === 'signal' ? reason.signal : 'fatal',
      timeoutMs: this.timeoutMs
    })
    this.shutdownPromise = this.runShutdown()
    return this.shutdownPromise
  }

  private async runShutdown(): Promise<ShutdownResult> {
    const failures: { resource: string; error: unknown }[] = []
    const cleanup = (async () => {
      for (const resource of this.resources) {
        try {
          await resource.close()
          this.logger.log('[SHUTDOWN_RESOURCE_CLOSED]', { resource: resource.name })
        } catch (error) {
          failures.push({ resource: resource.name, error })
          this.logger.warn('[SHUTDOWN_RESOURCE_FAILED]', {
            resource: resource.name,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }
    })()
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<'timeout'>(resolve => {
      timer = setTimeout(() => resolve('timeout'), this.timeoutMs)
    })
    const outcome = await Promise.race([
      cleanup.then(() => 'complete' as const),
      timeout
    ])
    if (timer) clearTimeout(timer)

    const timedOut = outcome === 'timeout'
    if (timedOut) {
      this.logger.warn('[SHUTDOWN_TIMEOUT]', { timeoutMs: this.timeoutMs })
    }
    this.stateValue = 'closed'
    this.logger.log('[SHUTDOWN_COMPLETE]', {
      state: this.stateValue,
      timedOut,
      failures: failures.length
    })
    return { timedOut, failures }
  }
}
