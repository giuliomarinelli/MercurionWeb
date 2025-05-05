import { Component, computed, effect, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThemeManagerService } from '../../services/stores/theme-manager.service';
import { PublicPipe } from '../../pipes/public.pipe';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';


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

  private firstStepSubscription: Subscription | undefined
  private secondStepSubscription: Subscription | undefined

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
  }

  goToPasswordStep(): void {
    this.authService.login_stepZero(this.loginForm.value['email']).subscribe({
      next: res => {
        this.step.set(2)
      },
      error: err => {
        this.serverErrorStep.set(1)
      }
    })
  }

  onSubmit(): void { }

  ngOnDestroy(): void {
    this.firstStepSubscription?.unsubscribe()
    this.secondStepSubscription?.unsubscribe()
  }



}
