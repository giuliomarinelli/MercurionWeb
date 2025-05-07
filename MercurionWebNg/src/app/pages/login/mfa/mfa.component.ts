import { NgClass } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, debounceTime, distinctUntilChanged, filter, map, Subscription } from 'rxjs';

export type MfaView = 'EMAIL_OTP' | 'SMS_OTP' | 'PH_V' | 'APP_TOTP' | ''

@Component({
  selector: 'app-mfa',
  imports: [ReactiveFormsModule, NgClass],
  templateUrl: './mfa.component.html',
  styleUrl: './mfa.component.css'
})
export class MfaComponent implements OnInit, OnDestroy {

  @ViewChild('otp')
  private otpRef!: ElementRef<HTMLInputElement>

  private paramsSub: Subscription | undefined
  private otpStateSub: Subscription | undefined
  protected view = signal<MfaView>('')
  protected serverError = signal<boolean>(false)
  private unTrusted = signal<boolean>(false)
  private viewList: string[] = ['EMAIL_OTP', 'SMS_OTP', 'PH_V', 'APP_TOTP', '']
  protected otpControl!: FormControl
  protected phoneControl!: FormControl
  protected isOtpFocused = signal<boolean>(false)
  protected isOtpEmpty = signal<boolean>(true)
  protected loading = signal<boolean>(false)

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fb: FormBuilder
  ) { }

  ngOnInit(): void {

    this.otpControl = this.fb.control(null, [Validators.required, Validators.pattern(/\d{6}/)])
    this.phoneControl = this.fb.control(null, [Validators.required])

    this.otpStateSub = this.otpControl.valueChanges
      .pipe(
        filter(val => !!val),
        debounceTime(300),
        distinctUntilChanged(),
      )
      .subscribe(code => {
        if (code.length === 6) {
          this.loading.set(true)
          this.verifyOtp()
        }
      })

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

  goTo(target: MfaView | 'VERIFY_OTP_ACTION'): void {
    switch (target) {
      case 'VERIFY_OTP_ACTION':
        this.verifyOtp()
      break
    }
  }

  onOtpInput(): void {
    const value = this.otpRef?.nativeElement?.value ?? '';
    this.isOtpEmpty.set(value.trim() === '');
  }

  onOtpBlur(): void {
    const value = this.otpRef?.nativeElement?.value ?? '';
    this.isOtpEmpty.set(value.trim() === '');
    this.isOtpFocused.set(false)
  }

  verifyOtp(): void {
    console.log(this.otpControl.value)
  }

  ngOnDestroy(): void {
    this.paramsSub?.unsubscribe()
    this.otpStateSub?.unsubscribe()
  }


}
