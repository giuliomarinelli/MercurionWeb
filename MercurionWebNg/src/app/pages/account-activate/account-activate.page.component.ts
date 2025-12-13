import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, of, Subscription, switchMap, tap } from 'rxjs';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { Helpers } from '../../helpers';
import { AccountService } from '../../services/account.service';
import { UserContextService } from '../../services/context/user-context.service';

@Component({
  selector: 'm-account-activate.page',
  imports: [ClassicSpinnerComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

    @if (loading()) {
      <div class="absolute inset-0 flex justify-center items-center">
        <m-classic-spinner [size]="85" />
      </div>
    } @else if (canView()) {
      <div class="mt-2 flex justify-center items-center flex-wrap gap-4 text-light-accent-secondary dark:text-dark-accent-secondary mb-8">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current text- h-6 w-auto md:h-7 lg:h-9">
          <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M384 384C472.4 384 544 455.6 544 544L544 576L480 576L480 544C480 491 437 448 384 448L256 448C203 448 160 491 160 544L160 576L96 576L96 544C96 455.6 167.6 384 256 384L384 384zM320 320C249.3 320 192 262.7 192 192C192 121.3 249.3 64 320 64C390.7 64 448 121.3 448 192C448 262.7 390.7 320 320 320zM320 128C284.7 128 256 156.7 256 192C256 227.3 284.7 256 320 256C355.3 256 384 227.3 384 192C384 156.7 355.3 128 320 128z"/>
        </svg>
        <h1 class="text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left">
          Account attivato!
        </h1>
      </div>
      <div class="main-container">
        <div class="bg-slate-200 dark:bg-slate-800 border my-16 border-slate-300 dark:border-slate-600 relative p-3 mx-auto max-w-[1024px] rounded-md text-sm flex gap-2 xs:gap-4 items-center flex-col xs:flex-row">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-20 h-auto shrink-[0.5] text-emerald-800 dark:text-emerald-400">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 96C196.3 96 96 196.3 96 320C96 443.7 196.3 544 320 544C443.7 544 544 443.7 544 320C544 196.3 443.7 96 320 96zM438.3 236.5L428.9 249.4L300.9 425.4L289.9 440.6L201.3 352L223.9 329.4L286 391.5L403 230.7L412.4 217.8L438.3 236.6z"/>
          </svg>
          <div class="flex flex-col gap-y-2">
            <p><strong>Il tuo account è stato attivato con successo!</strong>.</p>
            <p><span>Questo è il codice per recuperare l'account nel caso non riuscissi più ad accedere. Lo puoi visualizzare solo in questo momento. <br />Salvalo in un posto sicuro, come un Password Manager oppure stampalo e custodiscilo in un luogo inaccessibile ad altri:</span>.</p>
            <p class="text-light-warning dark:text-dark-warning font-semibold">{{recoveryCode()}}</p>
            <p><a class="text-center text-light-accent-primary dark:text-dark-accent-primary hover:underline" routerLink="/login">Vai al login</a></p>
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
  // ====================================================

  private qpSub?: Subscription

  loading = signal<boolean>(false)
  canView = signal<boolean>(false)
  recoveryCode = signal<string>('')

  private redirectToRoot(): void {
    this.router.navigateByUrl('/')
  }

  ngOnInit(): void {
    this.qpSub = this.route.queryParamMap.pipe(
      tap(() => {
        this.loading.set(true)
        this.userContext.logout()
      }),
      switchMap(params => {
        const t = params.get('t') ?? ''
        if (!t || !Helpers.isValidJwt(t)) {
          this.redirectToRoot()
          return EMPTY
        }
        return of(t)
      }),
      switchMap(t => this.accountService.activateAccount(t))
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
}
