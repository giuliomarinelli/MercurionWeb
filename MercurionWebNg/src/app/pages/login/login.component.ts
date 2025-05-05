import { Component, computed, effect, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThemeManagerService } from '../../services/stores/theme-manager.service';
import { PublicPipe } from '../../pipes/public.pipe';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { HttpErrorRes } from '../../Models/error-res.dto';


@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, PublicPipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, OnDestroy {

  protected loginForm!: FormGroup<any>
  protected logoSrc = computed(() =>
    this.themeManager.theme() === 'light' ? 'logo/pictogram-light-logo.svg' : 'logo/pictogram-dark-logo-2.svg')

  protected step = signal<1 | 2>(1)
  protected serverErrorStep = signal<0 | 1 | 2>(0)
  protected emptyEmail = signal<boolean>(false)
  protected emptyPassword = signal<boolean>(false)
  protected malformedEmail = signal<boolean>(false)

  private firstStepSubscription: Subscription | undefined
  private secondStepSubscription: Subscription | undefined
  private emailStatusChangeSubscription: Subscription | undefined

  constructor(
    private readonly fb: FormBuilder,
    private readonly themeManager: ThemeManagerService,
    private readonly router: Router,
    private readonly authService: AuthService
  ) { }

  ngDoCheck() {
    console.log(this.emptyEmail(), this.malformedEmail())
  }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: this.fb.control(null, [Validators.required, Validators.email]),
      password: this.fb.control(null, [Validators.required])
    })
    this.emailStatusChangeSubscription = this.loginForm.controls['email'].statusChanges.subscribe(() => {
      const control = this.loginForm.controls['email']
      this.emptyEmail.set(control.errors?.['required'] ?? false)
      this.malformedEmail.set(control.errors?.['email'] ?? false)
    })
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

  ngOnDestroy(): void {
    this.firstStepSubscription?.unsubscribe()
    this.secondStepSubscription?.unsubscribe()
    this.emailStatusChangeSubscription?.unsubscribe()
  }



}
