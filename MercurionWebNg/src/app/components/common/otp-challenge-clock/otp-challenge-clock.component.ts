import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  NgZone,
  signal,
} from '@angular/core'
import { epochMsFromUtcInstant, isUtcInstant } from '@mercurion/rest-contracts'
import { injectBrowserResourceOwner } from '../../../utils/browser-resource-owner.util'

export function otpDeadlineFromResponse(metadata: {
  expiresAt?: unknown
  timestamp?: unknown
}): number | null {
  if (!isUtcInstant(metadata.expiresAt) || !isUtcInstant(metadata.timestamp)) return null
  return (
    Date.now() +
    Math.max(
      0,
      epochMsFromUtcInstant(metadata.expiresAt) - epochMsFromUtcInstant(metadata.timestamp)
    )
  )
}

@Component({
  selector: 'm-otp-challenge-clock',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (deadline() !== null) {
      @if (remaining() > 0) {
        <p class="text-sm text-on-surface-secondary mb-2" aria-live="off">
          Intervallo del codice indicato dal server: circa
          <span class="tabular-nums">{{ remaining() }}</span> secondi rimanenti.
        </p>
      } @else {
        <p class="text-sm text-on-surface-secondary mb-2" role="status">
          Il tempo indicato per questo codice è terminato.
          @if (resendAvailable()) {
            Puoi richiedere un nuovo invio.
          } @else {
            Se il codice non viene accettato, ripeti l'accesso.
          }
        </p>
      }
    }
  `,
})
export class OtpChallengeClockComponent {
  readonly deadline = input<number | null>(null)
  readonly resendAvailable = input(true)
  private readonly now = signal(Date.now())
  protected readonly remaining = computed(() =>
    Math.max(0, Math.ceil(((this.deadline() ?? 0) - this.now()) / 1000))
  )

  constructor() {
    const resources = injectBrowserResourceOwner()
    inject(NgZone).runOutsideAngular(() => {
      resources.setInterval(() => this.now.set(Date.now()), 1000)
    })
  }
}
