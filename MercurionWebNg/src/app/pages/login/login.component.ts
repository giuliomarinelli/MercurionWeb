import { Component, computed, effect, ElementRef, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThemeManagerService } from '../../services/stores/theme-manager.service';
import { PublicPipe } from '../../pipes/public.pipe';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { HttpErrorRes } from '../../Models/types/interfaces/error-res.dto';
import { Login_FirstStepDTO } from '../../Models/types/auth/DTO/login.dtos';
import { Confirm_Login_FirstStepDTO } from '../../Models/types/interfaces/confirm.responses';
import { NgClass } from '@angular/common';


@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, PublicPipe, NgClass],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, OnDestroy {

  @ViewChild('email')
  private emailRef!: ElementRef<HTMLInputElement>
  @ViewChild('password')
  private passwordRef!: ElementRef<HTMLInputElement>

  protected loginForm!: FormGroup<any>
  protected logoSrc = computed(() =>
    this.themeManager.theme() === 'light' ? 'logo/pictogram-light-logo.svg' : 'logo/pictogram-dark-logo-2.svg')

  protected step = signal<1 | 2>(1)
  protected serverErrorStep = signal<0 | 1 | 2>(0)
  protected emptyPassword = signal<boolean>(false)
  protected malformedEmail = signal<boolean>(false)
  protected isEmailFocused = signal<boolean>(false)

  protected emptyEmail = signal(true)

  onEmailInput(): void {
    const value = this.emailRef?.nativeElement?.value ?? '';
    this.emptyEmail.set(value.trim() === '');
  }

  onPasswordInput(): void {
    const value = this.passwordRef?.nativeElement?.value ?? '';
    this.emptyEmail.set(value.trim() === '');
  }

  onBlur(field: 'email' | 'password'): void {
    if (field === 'email') {
      this.isEmailFocused.set(false)
      this.onEmailInput()
    }
  }

  private firstStepSubscription: Subscription | undefined
  private secondStepSubscription: Subscription | undefined
  private emailStatusChangeSubscription: Subscription | undefined

  constructor(
    private readonly fb: FormBuilder,
    private readonly themeManager: ThemeManagerService,
    private readonly router: Router,
    private readonly authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: this.fb.control(null, [Validators.required, Validators.email]),
      password: this.fb.control(null, [Validators.required])
    })
    this.emailStatusChangeSubscription = this.loginForm.controls['email'].statusChanges.subscribe(() => {
      const control = this.loginForm.controls['email']
      // this.emptyEmail.set(control.errors?.['required'] ?? false)
      this.malformedEmail.set(control.errors?.['email'] ?? false)
    })
  }

  protected isFocus(field: 'email' | 'password'): boolean {
    if (field === 'email') {
      return this.emailRef?.nativeElement.matches(':focus')
    }
    return false
  }

  goToPasswordStep(): void {
    if (this.loginForm.controls['email'].valid) {
      this.firstStepSubscription = this.authService.login_stepZero({ email: this.loginForm.value['email'] }).subscribe({
        next: () => {
          this.step.set(2)
        },
        error: err => {
          this.serverErrorStep.set(1)
          console.error(err.error)
          const body = err.error as HttpErrorRes
          if (body.statusCode === 400) {
            // handle bad request
          } else if (body.statusCode === 401) {
            this.serverErrorStep.set(1)
          } else {
            sessionStorage?.setItem('lastHttpErr', btoa(JSON.stringify(body)))
            this.router.navigate(['/'])
          }
        }
      })
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const dto: Login_FirstStepDTO = {
        email: this.loginForm.value['email'],
        password: this.loginForm.value['password'],
        remember: false
      }
      this.secondStepSubscription = this.authService.login_firstStep(dto).subscribe({
        next: (res: Confirm_Login_FirstStepDTO) => {
          if (res.needsMfa) {
            sessionStorage?.setItem('preAuthorizationToken', btoa(res.preAuthorizationToken as string))
            if (res.enabledMfaStrategies.length === 1) {
              this.router.navigate([`/login/mfa/${res.enabledMfaStrategies[0]}`])
            } else {
              this.router.navigate(['/login/mfa/choose-method'])
            }
          } else {
            sessionStorage?.setItem('accessToken', btoa(res.accessToken as string))
            const loginPath: string = atob(sessionStorage.getItem('loginLastPath') || '') || '/profile'
            console.log('ok')
            this.router.navigate([loginPath])
          }
        },
        error: err => {
          const body = err.error as HttpErrorRes
          console.error(body)
          if (body.statusCode === 400) {
            // handle bad request
          } else if (body.statusCode === 401) {
            this.serverErrorStep.set(2)
          } else {
            sessionStorage?.setItem('lastHttpErr', btoa(JSON.stringify(body)))
            // this.router.navigate(['/'])
          }
        }
      })
    }
  }

  ngOnDestroy(): void {
    this.firstStepSubscription?.unsubscribe()
    this.secondStepSubscription?.unsubscribe()
    this.emailStatusChangeSubscription?.unsubscribe()
  }



}
