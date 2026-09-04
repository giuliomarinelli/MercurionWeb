import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, EMPTY, filter, of, Subscription, switchMap, take, tap } from 'rxjs';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { Helpers } from '../../helpers';
import { AccountService } from '../../services/account.service';
import { UserContextService } from '../../services/context/user-context.service';
import { ToastService } from '../../services/toast.service';
import { CopyUiService } from '../../services/copy-ui.service';
import { DesignService } from '../../services/design.service';

@Component({
  selector: 'm-account-activate.page',
  imports: [ClassicSpinnerComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

    @if (loading()) {
      <div class="absolute inset-0 flex justify-center items-center" role="status" aria-live="assertive">
        @if (design.maxBk('md')()) {
          <m-classic-spinner [size]="30" />
        } @else if (design.minBk('md')()) {
          <m-classic-spinner [size]="60" />
        }
      </div>
    } @else if (canView()) {
      <div class="mt-2 flex flex-col xs:flex-row justify-center items-center gap-3 xs:gap-4 text-light-accent-secondary dark:text-dark-accent-secondary mb-8 text-center xs:text-left" aria-live="polite">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-7 md:size-8 lg:size-10">
          <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M240 192C240 147.8 275.8 112 320 112C364.2 112 400 147.8 400 192C400 236.2 364.2 272 320 272C275.8 272 240 236.2 240 192zM146.2 576L195.4 416L444.5 416L493.7 576L543.9 576L479.9 368L159.9 368L95.9 576L146.1 576zM320 320C390.7 320 448 262.7 448 192C448 121.3 390.7 64 320 64C249.3 64 192 121.3 192 192C192 262.7 249.3 320 320 320z" />
        </svg>
        <h1 class="text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left">
          Account attivato!
        </h1>
      </div>
      <div class="main-container">
        <div class="bg-slate-200 dark:bg-slate-800 border my-16 border-slate-300 dark:border-slate-600 relative p-3 mx-auto max-w-[1024px] rounded-md text-sm flex gap-2 xs:gap-4 items-center flex-col xs:flex-row" role="region" aria-label="Informazioni attivazione account">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-20 h-auto shrink-[0.5] text-emerald-800 dark:text-emerald-400">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 96C196.3 96 96 196.3 96 320C96 443.7 196.3 544 320 544C443.7 544 544 443.7 544 320C544 196.3 443.7 96 320 96zM438.3 236.5L428.9 249.4L300.9 425.4L289.9 440.6L201.3 352L223.9 329.4L286 391.5L403 230.7L412.4 217.8L438.3 236.6z"/>
          </svg>
          <div class="flex flex-col gap-y-2">
            <p><strong>Il tuo account è stato attivato con successo!</strong>.</p>
            <p><span>Questo è il codice per recuperare l'account nel caso non riuscissi più ad accedere. Lo puoi visualizzare solo in questo momento. <br />Salvalo in un posto sicuro, come un Password Manager oppure stampalo e custodiscilo in un luogo inaccessibile ad altri:</span>.</p>
            <div class="flex items-center gap-2">
              <p class="text-light-warning dark:text-dark-warning font-semibold" aria-live="assertive">{{recoveryCode()}}</p>
              <button
                type="button"
                class="relative p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary-hq focus-visible:ring-offset-2 focus-visible:ring-offset-light-surface-secondary dark:focus-visible:ring-offset-dark-surface-secondary transition-colors duration-150"
                title="Copia."
                (click)="copy()"
              >
                <svg
                  class="shrink-0 size-5 text-slate-600 dark:text-slate-300"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true">
                    <path
                      d="M4 4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1h-1V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1v1H6a2 2 0 0 1-2-2V4z"
                    />
                    <path
                      d="M8 6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V6z" />
                </svg>
              </button>
            </div>
            <p><a class="a-hc" routerLink="/login">Vai al login</a></p>
          </div>
        </div>
      </div>
    }
  `
})
export class AccountActivatePageComponent implements OnInit, OnDestroy {
  // ======================= DEPS =======================
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly accountService = inject(AccountService)
  private readonly userContext = inject(UserContextService)
  private readonly toast = inject(ToastService)
  private readonly copyUiService = inject(CopyUiService)
  protected readonly design = inject(DesignService)
  // ====================================================

  private qpSub?: Subscription

  loading = signal<boolean>(false)
  canView = signal<boolean>(false)
  recoveryCode = signal<string>('')

  private redirectToRoot(): void {
    this.router.navigateByUrl('/')
  }

  ngOnInit(): void {
    this.qpSub = combineLatest([
      this.route.queryParamMap,
      this.route.fragment
    ]).pipe(
      tap(() => {
        this.loading.set(true)
        this.userContext.logout()
      }),
      filter(([, frag]) => !!frag),
      take(1),
      switchMap(([_, frag]) => {

        const t = frag ? (new URLSearchParams(frag).get('t') ?? '') : ''

        if (!t || !Helpers.isValidJwt(t)) {
          this.redirectToRoot()
          return EMPTY
        }

        this.router.navigate([], {
          relativeTo: this.route,
          replaceUrl: true,
          fragment: undefined
        })

        queueMicrotask(() => {
          if (location.hash) {
            history.replaceState({}, '', location.pathname + location.search)
          }
        })

        return of(t)

      }),
      switchMap((t) => this.accountService.activateAccount(t))
    ).subscribe({
      next: (res) => {
        this.canView.set(true)
        this.loading.set(false)
        this.recoveryCode.set(res.recoveryCode)
      },
      error: () => this.redirectToRoot()
    })
  }
  ngOnDestroy(): void {
    this.qpSub?.unsubscribe()
  }

  copy(): void {

    const secret = this.recoveryCode()


    if (!secret || !secret.trim()) {
      this.toast.trigger(
        'Nessun codice da copiare.',
        'error',
        2200
      )
      return
    }

    this.copyUiService
      .copy(secret, {
        successMessage: 'Codice copiato negli appunti ✅',
        errorMessage: 'Impossibile copiare il codice. Copialo manualmente.',
        successContext: 'success',
        errorContext: 'error',
        durationMs: 2200,
        forceToast: true })
      .catch(() => {
        this.toast.trigger(
          'Impossibile copiare il codice. Copialo manualmente.',
          'error',
          2500
        )
      })
  }


}
