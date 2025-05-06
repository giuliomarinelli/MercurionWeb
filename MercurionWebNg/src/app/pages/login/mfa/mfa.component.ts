import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

export type MfaView = 'EMAIL_OTP' | 'SMS_OTP' | 'PH_V' | 'APP_TOTP' | ''

@Component({
  selector: 'app-mfa',
  imports: [],
  templateUrl: './mfa.component.html',
  styleUrl: './mfa.component.css'
})
export class MfaComponent implements OnInit, OnDestroy {

  private paramsSubs: Subscription | undefined
  private view: MfaView = ''
  private viewList: string[] = ['EMAIL_OTP', 'SMS_OTP', 'PH_V', 'APP_TOTP', '']

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const view: string | null | undefined = params['view']
      if (!view) {
        this.view = ''
      } else if (this.viewList.includes(view) && view !== '') {
        this.view = view as MfaView
      }
      console.log(this.view)
    })
  }

  ngOnDestroy(): void {
    this.paramsSubs?.unsubscribe()
  }


}
