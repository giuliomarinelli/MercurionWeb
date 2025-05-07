import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, map, Subscription } from 'rxjs';

export type MfaView = 'EMAIL_OTP' | 'SMS_OTP' | 'PH_V' | 'APP_TOTP' | ''

@Component({
  selector: 'app-mfa',
  imports: [],
  templateUrl: './mfa.component.html',
  styleUrl: './mfa.component.css'
})
export class MfaComponent implements OnInit, OnDestroy {

  private paramsSub: Subscription | undefined
  private view = signal<MfaView>('')
  private unTrusted = signal<boolean>(false)
  private viewList: string[] = ['EMAIL_OTP', 'SMS_OTP', 'PH_V', 'APP_TOTP', '']

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) { }

  ngOnInit(): void {
    this.paramsSub = combineLatest([
      this.route.paramMap,
      this.route.queryParamMap
    ])
    .pipe(
      map(([params, query]) => {
        const view = params.get('view') as MfaView | null;
        const trustVerify = (query.get('trust_verify') ?? 'false') === 'true';
        return { view, trustVerify }
      })
    )
    .subscribe(({ view, trustVerify }) => {

      if (!view) {
        this.view.set('');
        this.unTrusted.set(false);
        return;
      }

      if (this.viewList.includes(view)) {
        this.view.set(view)
        const mustVerify = (view === 'EMAIL_OTP' || view === 'SMS_OTP') && trustVerify
        this.unTrusted.set(mustVerify)
      }
    })
  }

  ngOnDestroy(): void {
    this.paramsSub?.unsubscribe()
  }


}
