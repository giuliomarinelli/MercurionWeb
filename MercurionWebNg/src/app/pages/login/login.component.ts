import { Component, computed, effect, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThemeManagerService } from '../../services/stores/theme-manager.service';
import { PublicPipe } from '../../pipes/public.pipe';


@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, PublicPipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {

  protected loginForm!: FormGroup<any>
  protected logoSrc = computed(() =>
    this.themeManager.theme() === 'light' ? 'logo/pictogram-light-logo.svg' : 'logo/pictogram-dark-logo-2.svg')

  protected step = signal<1 | 2>(1)

  constructor(
    private readonly fb: FormBuilder,
    private readonly themeManager: ThemeManagerService
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: this.fb.control(null, [Validators.required, Validators.email]),
      password: this.fb.control(null, [Validators.required])
    })
  }

  goToPasswordStep(): void { }

  onSubmit(): void { }



}
