import { Injectable, computed, signal } from '@angular/core'
import {
  ActionOverlayEvent,
  ActionOverlayState,
  ActionScope,
  ActionSession,
  ActionSessionInputMap,
  ActiveActionScope
} from '../../../Models/action/action-overlay.models'

const OPEN_DELAY_MS = 10
const UNMOUNT_DELAY_MS = 300
const CLEAR_SCOPE_DELAY_MS = 500

/**
 * `void`-input scopes may be opened without a second argument; every other scope
 * requires its typed immutable input at open/switch time.
 */
export type ActionSessionInputArgs<S extends ActiveActionScope> =
  ActionSessionInputMap[S] extends void ? [input?: undefined] : [input: ActionSessionInputMap[S]]

export function transitionActionOverlay(
  state: ActionOverlayState,
  event: ActionOverlayEvent
): ActionOverlayState {
  const nextGeneration = state.generation + 1

  switch (event.type) {
    case 'OPEN':
      return state.phase === 'active'
        ? { phase: state.phase, scope: event.scope, generation: nextGeneration, input: event.input }
        : { phase: 'opening', scope: event.scope, generation: nextGeneration, input: event.input }
    case 'ACTIVATE':
      return state.phase === 'opening' && state.generation === event.generation
        ? { phase: 'active', scope: state.scope, generation: state.generation, input: state.input }
        : state
    case 'SUBMIT':
      return (state.phase === 'active' || state.phase === 'failed') && state.generation === event.sessionId
        ? { phase: 'submitting', scope: state.scope, generation: state.generation, input: state.input }
        : state
    case 'SUBMIT_SUCCEEDED':
      return state.phase === 'submitting' && state.generation === event.sessionId
        ? { phase: 'succeeded', scope: state.scope, generation: state.generation, input: state.input }
        : state
    case 'SUBMIT_FAILED':
      return state.phase === 'submitting' && state.generation === event.sessionId
        ? { phase: 'failed', scope: state.scope, generation: state.generation, input: state.input }
        : state
    case 'CANCEL':
    case 'CLOSE':
      if (state.phase === 'closed' || state.phase === 'closing' || state.phase === 'settling') return state
      if (event.sessionId !== undefined && event.sessionId !== state.generation) return state
      return { phase: 'closing', scope: state.scope, generation: nextGeneration, input: state.input }
    case 'UNMOUNT':
      return state.phase === 'closing' && state.generation === event.generation
        ? { phase: 'settling', scope: state.scope, generation: state.generation, input: state.input }
        : state
    case 'CLEAR':
      return state.phase === 'settling' && state.generation === event.generation
        ? { phase: 'closed', generation: state.generation }
        : state
  }
}

@Injectable({ providedIn: 'root' })
export class ActionOverlayContextService {
  private readonly _state = signal<ActionOverlayState>({ phase: 'closed', generation: 0 })
  private timers: ReturnType<typeof setTimeout>[] = []

  readonly state = this._state.asReadonly()
  readonly isOpened = computed(() => {
    const phase = this._state().phase
    return phase === 'opening' || phase === 'active' || phase === 'submitting' ||
      phase === 'succeeded' || phase === 'failed'
  })
  readonly isVisible = computed(() => this.isOpened() && this._state().phase !== 'opening')
  readonly isMounted = computed(() => this._state().phase !== 'closed' && this._state().phase !== 'settling')
  readonly scope = computed<ActionScope>(() => {
    const state = this._state()
    return state.phase === 'closed' ? '' : state.scope
  })
  readonly shouldMount = this.isMounted

  /**
   * Returns the active session for `scope`, or `null` when no session is currently
   * open for that scope. `session.id` is the generation token that must be threaded
   * back into `close`/`beginSubmit`/`submitSucceeded`/`submitFailed` to guarantee a
   * stale/late async completion from a previous session cannot mutate a newer one.
   */
  session<S extends ActiveActionScope>(scope: S): ActionSession<S> | null {
    const state = this._state()
    if (state.phase === 'closed' || state.scope !== scope) return null
    return { id: state.generation, scope: state.scope as S, input: state.input as ActionSessionInputMap[S] }
  }

  open<S extends ActiveActionScope>(scope: S, ...args: ActionSessionInputArgs<S>): number {
    if (!scope) return this._state().generation
    this.dispatch({ type: 'OPEN', scope, input: args[0] })
    return this._state().generation
  }

  switchToScope<S extends ActiveActionScope>(scope: S, ...args: ActionSessionInputArgs<S>): number {
    if (!scope) return this._state().generation
    this.dispatch({ type: 'OPEN', scope, input: args[0] })
    return this._state().generation
  }

  /**
   * Closes the overlay. When `sessionId` is provided, the close is ignored unless it
   * still targets the current session, which prevents a late async completion from a
   * previous/stale session from closing a newer one.
   */
  close(sessionId?: number): void {
    this.dispatch({ type: 'CLOSE', sessionId })
  }

  cancel(sessionId?: number): void {
    this.dispatch({ type: 'CANCEL', sessionId })
  }

  beginSubmit(sessionId: number): void {
    this.dispatch({ type: 'SUBMIT', sessionId })
  }

  submitSucceeded(sessionId: number): void {
    this.dispatch({ type: 'SUBMIT_SUCCEEDED', sessionId })
  }

  submitFailed(sessionId: number): void {
    this.dispatch({ type: 'SUBMIT_FAILED', sessionId })
  }

  private dispatch(event: ActionOverlayEvent): void {
    const isTimerEvent = event.type === 'ACTIVATE' || event.type === 'UNMOUNT' || event.type === 'CLEAR'
    if (!isTimerEvent) this.cancelTimers()

    const previous = this._state()
    const next = transitionActionOverlay(previous, event)
    if (next === previous) return

    this._state.set(next)
    this.scheduleTransition(next)
  }

  private scheduleTransition(state: ActionOverlayState): void {
    switch (state.phase) {
      case 'opening':
        this.schedule({ type: 'ACTIVATE', generation: state.generation }, OPEN_DELAY_MS)
        break
      case 'closing':
        this.schedule({ type: 'UNMOUNT', generation: state.generation }, UNMOUNT_DELAY_MS)
        break
      case 'settling':
        this.schedule({ type: 'CLEAR', generation: state.generation }, CLEAR_SCOPE_DELAY_MS - UNMOUNT_DELAY_MS)
        break
    }
  }

  private schedule(event: ActionOverlayEvent, delay: number): void {
    const timer = setTimeout(() => {
      this.timers = this.timers.filter((candidate) => candidate !== timer)
      this.dispatch(event)
    }, delay)
    this.timers.push(timer)
  }

  private cancelTimers(): void {
    this.timers.forEach((timer) => clearTimeout(timer))
    this.timers = []
  }
}
