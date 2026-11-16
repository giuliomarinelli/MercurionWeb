import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, signal, WritableSignal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { finalize, Subscription } from 'rxjs'
import { FeedbackService } from '../../services/feedback.service'
import { CreateFeedbackDTO } from '../../Models/feedback.models'
import { StarRatingComponent } from '../../components/feedback/star-rating/star-rating.component'
import { TextareaComponent } from '../../components/common/textarea/textarea.component'
import { ButtonComponent } from '../../components/common/button/button.component'
import { APP_CONFIG } from '../../config/app-config'

@Component({
  selector: 'm-feedback-page',
  imports: [StarRatingComponent, TextareaComponent, ButtonComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @keyframes fade-out {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    .fade-out-ani {
      animation: 0.6s ease-in-out 3s both fade-out;
    }

    @media (prefers-reduced-motion: reduce) {
      .fade-out-ani {
        animation: none;
      }
    }
  `,
  template: `
    <section class="main-container text-on-surface-main" aria-labelledby="feedback-heading">
      <h1 id="feedback-heading" class="h1-underline">Feedback</h1>
      <div class="flex items-start gap-4 rounded-2xl border border-token-border bg-surface-elevated p-4 text-on-surface-main sm:p-6">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-8 text-gray-700 dark:text-slate-200 shrink-0" aria-hidden="true">
          <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M416 64L416 144L496 144L496 176L416 176L416 256L384 256L384 176L304 176L304 144L384 144L384 64L416 64zM528 224L528 272L576 272L576 304L528 304L528 352L496 352L496 304L448 304L448 272L496 272L496 224L528 224zM275.3 244.2L317.2 329.2C388.7 339.6 433.3 346.1 450.9 348.6C438.2 361 405.9 392.5 354.2 442.9C366.4 514.1 374 558.5 377 576C361.2 567.7 321.4 546.8 257.4 513.1C193.4 546.7 153.6 567.7 137.8 576C140.8 558.5 148.4 514.1 160.6 442.9C108.9 392.5 76.6 361 63.9 348.6C81.5 346 126.1 339.6 197.6 329.2C229.6 264.4 249.5 224 257.4 208.1L275.2 244.3zM312.6 360.9L296 358.4C295 356.3 282.1 330.3 257.5 280.3C232.8 330.3 220 356.3 219 358.4C216.7 358.7 188 362.9 132.8 370.9C172.7 409.8 193.5 430.1 195.2 431.7C194.8 434 189.9 462.6 180.5 517.5C229.8 491.6 255.5 478.1 257.6 477C259.6 478.1 285.3 491.6 334.7 517.5C325.3 462.6 320.4 434 320 431.7C321.7 430.1 342.4 409.8 382.4 370.9L312.9 360.8z" />
        </svg>

        <div class="min-w-0 space-y-2 text-sm leading-6">
          <p>Aiutaci a migliorare Mercurion: valuta la tua esperienza o condividi un suggerimento.</p>
          <p class="text-on-surface-secondary">Il feedback è associato al tuo account. Non inserire password o codici di sicurezza.</p>
          <p>Per un problema che richiede una risposta, <a class="a underline underline-offset-4" routerLink="/help">apri un ticket di supporto</a>.</p>
        </div>
      </div>
      <form class="mt-6 flex flex-col gap-5 rounded-2xl border border-token-border bg-surface-elevated p-4 text-on-surface-main sm:p-6"
        (submit)="$event.preventDefault(); submit()" [attr.aria-busy]="submitting()">
        <fieldset class="min-w-0 space-y-4" [disabled]="submitting()">
          <legend class="mb-3 text-base font-semibold">Come valuti la tua esperienza?</legend>
          <p class="text-sm text-on-surface-secondary">Le valutazioni sono facoltative. Puoi inviare anche soltanto un messaggio.</p>
          <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span class="text-sm font-medium">Utilità</span>
            <m-star-rating label="Utilità" [value]="ratingUtility()" (valueChange)="onRatingInput(ratingUtility, $event)" [disabled]="submitting()" />
          </div>
          <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span class="text-sm font-medium">Chiarezza</span>
            <m-star-rating label="Chiarezza" [value]="ratingClarity()" (valueChange)="onRatingInput(ratingClarity, $event)" [disabled]="submitting()" />
          </div>
          <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span class="text-sm font-medium">Esperienza</span>
            <m-star-rating label="Esperienza" [value]="ratingExperience()" (valueChange)="onRatingInput(ratingExperience, $event)" [disabled]="submitting()" />
          </div>
        </fieldset>
        <m-textarea label="Messaggio di feedback" placeholder="Cosa funziona bene? Cosa potremmo migliorare?"
          [value]="message()" (valueChange)="onMessageInput($event)" [disabled]="submitting()"
          [maxLength]="4000" [showCount]="true" resizeMode="vertical" [rows]="5"
          hint="Scrivi un suggerimento o descrivi la tua esperienza. Massimo 4000 caratteri." />
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div class="min-h-6 min-w-0 text-sm">
            @if (error()) {
              <p class="text-red-700 dark:text-red-300" role="alert">{{ error() }}</p>
            }
            @if (sent()) {
              <p role="status" class="font-semibold text-emerald-800 dark:text-emerald-200"
                [class.fade-out-ani]="sendClicked()" [class.hidden]="hideAck()">Grazie, il tuo feedback è stato inviato.</p>
            }
            @if (!hasAtLeastOneValue() && !sent()) {
              <p class="text-on-surface-secondary">Seleziona almeno una valutazione o scrivi un messaggio.</p>
            }
          </div>
          <m-button type="submit" [disabled]="!canSubmit()" [loading]="submitting()" ariaLabel="Invia feedback">
            {{ submitting() ? 'Invio in corso…' : 'Invia feedback' }}
          </m-button>
        </div>
      </form>
    </section>
  `,
})
export class FeedbackPageComponent implements OnDestroy {
  private readonly feedbackService = inject(FeedbackService)
  private readonly appConfig = inject(APP_CONFIG)
  private request?: Subscription
  private ackTimer?: ReturnType<typeof setTimeout>

  readonly ratingUtility = signal<number | null>(null)
  readonly ratingClarity = signal<number | null>(null)
  readonly ratingExperience = signal<number | null>(null)
  readonly message = signal('')
  readonly submitting = signal(false)
  readonly sent = signal(false)
  readonly error = signal<string | null>(null)
  readonly sendClicked = signal(false)
  readonly hideAck = signal(false)
  readonly hasAtLeastOneValue = computed(() =>
    this.ratingUtility() !== null || this.ratingClarity() !== null ||
    this.ratingExperience() !== null || this.message().trim().length > 0,
  )
  readonly canSubmit = computed(() => this.hasAtLeastOneValue() && this.message().length <= 4000 && !this.submitting())

  onMessageInput(value: string): void {
    if (this.submitting()) return
    this.message.set(value)
    this.clearAcknowledgement()
    this.error.set(null)
  }

  onRatingInput(target: WritableSignal<number | null>, value: number | null): void {
    if (this.submitting()) return
    target.set(value)
    this.clearAcknowledgement()
    this.error.set(null)
  }

  submit(): void {
    if (!this.canSubmit()) return
    this.clearAcknowledgement()
    this.submitting.set(true)
    this.error.set(null)
    const dto: CreateFeedbackDTO = {
      env: this.appConfig.capabilities.feedbackEnv,
      kind: 'ux', contextKind: 'global',
      ratingUtility: this.ratingUtility() ?? undefined,
      ratingClarity: this.ratingClarity() ?? undefined,
      ratingExperience: this.ratingExperience() ?? undefined,
      message: this.message().trim() || undefined,
      clientVersion: this.appConfig.release.version,
    }
    this.request = this.feedbackService.createFeedback(dto).pipe(
      finalize(() => this.submitting.set(false)),
    ).subscribe({
      next: feedback => {
        if (!feedback?.id) {
          this.error.set('Invio non confermato. Le informazioni inserite sono conservate.')
          return
        }
        this.sent.set(true)
        this.hideAck.set(false)
        this.sendClicked.set(true)
        this.ratingUtility.set(null)
        this.ratingClarity.set(null)
        this.ratingExperience.set(null)
        this.message.set('')
        this.ackTimer = setTimeout(() => {
          this.ackTimer = undefined
          this.sendClicked.set(false)
          this.hideAck.set(true)
        }, 4000)
      },
      error: () => this.error.set('Invio non confermato. Le informazioni inserite sono conservate; riprova più tardi.'),
    })
  }

  private clearAcknowledgement(): void {
    if (this.ackTimer !== undefined) clearTimeout(this.ackTimer)
    this.ackTimer = undefined
    this.sent.set(false)
    this.hideAck.set(false)
    this.sendClicked.set(false)
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe()
    this.clearAcknowledgement()
  }
}
