import { Injectable, computed, signal } from '@angular/core'
import {
  ActionOverlayEvent,
  ActionOverlayState,
  ActionScope,
  ActiveActionScope
} from '../../../Models/action/action-overlay.models'

const OPEN_DELAY_MS = 10
const UNMOUNT_DELAY_MS = 300
const CLEAR_SCOPE_DELAY_MS = 500

export function transitionActionOverlay(
  state: ActionOverlayState,
  event: ActionOverlayEvent
): ActionOverlayState {
  const nextGeneration = state.generation + 1

  switch (event.type) {
    case 'OPEN':
      return state.phase === 'active'
        ? { phase: state.phase, scope: event.scope, generation: nextGeneration }
        : { phase: 'opening', scope: event.scope, generation: nextGeneration }
    case 'ACTIVATE':
      return state.phase === 'opening' && state.generation === event.generation
        ? { phase: 'active', scope: state.scope, generation: state.generation }
        : state
    case 'SUBMIT':
      return state.phase === 'active' || state.phase === 'failed'
        ? { phase: 'submitting', scope: state.scope, generation: state.generation }
        : state
    case 'SUBMIT_SUCCEEDED':
      return state.phase === 'submitting'
        ? { phase: 'succeeded', scope: state.scope, generation: state.generation }
        : state
    case 'SUBMIT_FAILED':
      return state.phase === 'submitting'
        ? { phase: 'failed', scope: state.scope, generation: state.generation }
        : state
    case 'CANCEL':
    case 'CLOSE':
      return state.phase === 'closed' || state.phase === 'closing' || state.phase === 'settling'
        ? state
        : { phase: 'closing', scope: state.scope, generation: nextGeneration }
    case 'UNMOUNT':
      return state.phase === 'closing' && state.generation === event.generation
        ? { phase: 'settling', scope: state.scope, generation: state.generation }
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

  open(scope: ActionScope): void {
    if (!scope) return
    this.dispatch({ type: 'OPEN', scope })
  }

  close(): void {
    this.dispatch({ type: 'CLOSE' })
  }

  cancel(): void {
    this.dispatch({ type: 'CANCEL' })
  }

  beginSubmit(): void {
    this.dispatch({ type: 'SUBMIT' })
  }

  submitSucceeded(): void {
    this.dispatch({ type: 'SUBMIT_SUCCEEDED' })
  }

  submitFailed(): void {
    this.dispatch({ type: 'SUBMIT_FAILED' })
  }

  switchToScope(scope: ActionScope): void {
    if (!scope) return
    this.dispatch({ type: 'OPEN', scope })
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
