import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, signal } from '@angular/core'
import { FeedbackService } from '../../services/feedback.service'
import { FeedbackEnv, FeedbackKind, FeedbackContextKind, CreateFeedbackDTO } from '../../Models/feedback.models'
import { StarRatingComponent } from '../../components/feedback/star-rating/star-rating.component'
import { environment } from '../../../environments/environment'
import { Subscription } from 'rxjs'

@Component({
  selector: 'm-feedback-page',
  imports: [StarRatingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `

    @keyframes fade-out {
      from {
        opacity: 1
      } to {
        opacity: 0;
      }
    }

    .fade-out-ani {
      animation: .6s ease-in-out 3s both fade-out;
    }

  `,
  template: `
    <section class="main-container" role="main" aria-labelledby="feedback-heading">
      <h1 id="feedback-heading" class="h1-underline">Feedback</h1>
      <div class="flex gap-6 items-center px-6 py-4 bg-slate-100 dark:bg-slate-900 rounded-lg border border-px border-slate-300 dark:border-slate-700">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-11 text-gray-700 dark:text-slate-200 shrink-0">
          <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M416 64L416 144L496 144L496 176L416 176L416 256L384 256L384 176L304 176L304 144L384 144L384 64L416 64zM528 224L528 272L576 272L576 304L528 304L528 352L496 352L496 304L448 304L448 272L496 272L496 224L528 224zM275.3 244.2L317.2 329.2C388.7 339.6 433.3 346.1 450.9 348.6C438.2 361 405.9 392.5 354.2 442.9C366.4 514.1 374 558.5 377 576C361.2 567.7 321.4 546.8 257.4 513.1C193.4 546.7 153.6 567.7 137.8 576C140.8 558.5 148.4 514.1 160.6 442.9C108.9 392.5 76.6 361 63.9 348.6C81.5 346 126.1 339.6 197.6 329.2C229.6 264.4 249.5 224 257.4 208.1L275.2 244.3zM312.6 360.9L296 358.4C295 356.3 282.1 330.3 257.5 280.3C232.8 330.3 220 356.3 219 358.4C216.7 358.7 188 362.9 132.8 370.9C172.7 409.8 193.5 430.1 195.2 431.7C194.8 434 189.9 462.6 180.5 517.5C229.8 491.6 255.5 478.1 257.6 477C259.6 478.1 285.3 491.6 334.7 517.5C325.3 462.6 320.4 434 320 431.7C321.7 430.1 342.4 409.8 382.4 370.9L312.9 360.8z" />
        </svg>
        <p class="text-[.925rem] leading-7">
          La tua opinione è qualcosa di <em>enormemente prezioso</em> per far crescere Mercurion e migliorare costantemente.<br /> Lasciaci il tuo feedback: è completamente anonimo.
        </p>
      </div>

      <div class="mt-5 w-full rounded-2xl bg-slate-100 dark:bg-slate-900/80 backdrop-blur-md p-5 border border-px border-slate-300 dark:border-slate-700">
        <div class="flex items-center justify-between py-2">
          <div class=" font-semibold">Utilità</div>
          <m-star-rating label="Utilità" [(value)]="ratingUtility" />
        </div>

        <div class="flex items-center justify-between py-2">
          <div class=" font-semibold">Chiarezza</div>
          <m-star-rating label="Chiarezza" [(value)]="ratingClarity" />
        </div>

        <div class="flex items-center justify-between py-2">
          <div class=" font-semibold">Esperienza</div>
          <m-star-rating label="Esperienza" [(value)]="ratingExperience" />
        </div>

        <div class="my-4 h-px bg-sky-300/10"></div>

        <textarea
          class="w-full min-h-[120px] rounded-xl border border-slate-300 bg-slate-50 dark:border-sky-300/15 dark:bg-slate-950/70 px-3 py-3 dark:text-slate-100/90 outline-none focus:border-light-accent-primary-hq focus:ring-light-accent-primary-hq/70 dark:focus:border-sky-200/60 focus:ring-2 dark:focus:ring-sky-200/60 resize-y transition-all duration-150"
          placeholder="Raccontami cosa ha funzionato e cosa no..."
          [value]="message()"
          (input)="onMessageInput($event)"
          aria-label="Messaggio di feedback"
          aria-live="polite"
        ></textarea>

        <div class="mt-3 flex items-center justify-end gap-3">
          @if (error()) {
            <span class="text-red-900 text-sm" role="alert" aria-live="assertive">{{ error() }}</span>
          }

          @if (sent()) {
            <p class="text-emerald-900 dark:text-dark-accent-secondary text-sm font-semibold w-fit"
              [class.fade-out-ani]="sendClicked()"
              [class.hidden]="hideAck()">
              Grazie 💙
            </p>
          }

          <button
            type="button"
            class="rounded-xl border dark:border-sky-300/35 px-6 py-2 font-bold
                   disabled:opacity-50 disabled:cursor-not-allowed
                  dark:bg-slate-900 dark:hover:bg-sky-400/15
                  border-slate-700 bg-transparent hover:bg-white/35
                  "
            [disabled]="!canSubmit()"
            (click)="submit()"
            [attr.aria-disabled]="!canSubmit()"
            aria-label="Invia feedback"
          >
            @if (submitting()) { <span>Invio...</span> }
            @else { <span>Invia</span> }
          </button>
        </div>
        <div class="mt-2 dark:text-slate-300/80 text-xs cursor-default h-4">
          @if (!hasAtLeastOneValue()) {
            <span>
              Inserisci almeno un rating o un messaggio
            </span>
          }
        </div>
      </div>
    </section>
  `
})
export class FeedbackPageComponent implements OnDestroy {

  private readonly feedbackService = inject(FeedbackService)

  private timeOutBinding = signal<ReturnType<typeof setTimeout> | null>(null)
  // --- Signal Form state
  ratingUtility = signal<number | null>(null)
  ratingClarity = signal<number | null>(null)
  ratingExperience = signal<number | null>(null)
  message = signal<string>('')

  private sub?: Subscription

  submitting = signal(false)
  sent = signal(false)
  error = signal<string | null>(null)

  sendClicked = signal<boolean>(false)
  hideAck = signal<boolean>(false)

  // --- Validazione: replica la policy backend
  hasAtLeastOneValue = computed(() =>
    this.ratingUtility() !== null ||
    this.ratingClarity() !== null ||
    this.ratingExperience() !== null ||
    this.message().trim().length > 0
  )

  canSubmit = computed(() =>
    this.hasAtLeastOneValue() && !this.submitting()
  )

  onMessageInput(e: Event) {
    const value = (e.target as HTMLTextAreaElement).value
    this.message.set(value)
    if (this.sent()) this.sent.set(false)
    if (this.error()) this.error.set(null)
  }

  submit() {

    if (!this.canSubmit()) {
      return
    }

    if (this.timeOutBinding()) {
      queueMicrotask(() => {
        clearInterval(this.timeOutBinding() as ReturnType<typeof setInterval>)
        this.timeOutBinding.set(null)
        this.sendClicked.set(false)
        this.hideAck.set(true)
      })
    }

    this.sendClicked.set(true)
    setTimeout(() => {
      queueMicrotask(() => {
        this.sendClicked.set(false)
        this.hideAck.set(true)
      })
    }, 4000)

    this.submitting.set(true)
    this.sent.set(false)
    this.error.set(null)

    const dto: CreateFeedbackDTO = {
      env: environment.feedbackEnv as FeedbackEnv,
      kind: 'ux' as FeedbackKind,             // poi si può rendere select volendo
      contextKind: 'global' as FeedbackContextKind,
      ratingUtility: this.ratingUtility() ?? undefined,
      ratingClarity: this.ratingClarity() ?? undefined,
      ratingExperience: this.ratingExperience() ?? undefined,
      message: this.message().trim() || undefined,
      clientVersion: environment.version
    }

    this.sub = this.feedbackService.createFeedback(dto).subscribe({
      next: () => queueMicrotask(() => {
        this.hideAck.set(false)
        this.sent.set(true)
        this.ratingUtility.set(null)
        this.ratingClarity.set(null)
        this.ratingExperience.set(null)
        this.message.set('')
      })
      ,
      error: () => {
        this.error.set('Errore durante l’invio del feedback')
      },
      complete: () => {
        this.submitting.set(false)
      }
    })
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe()
  }

}
