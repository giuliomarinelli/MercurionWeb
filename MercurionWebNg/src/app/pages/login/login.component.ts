import { NgIf } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';


@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {

  protected loginForm!: FormGroup<any>

  protected step = signal<1 | 2>(1)

  constructor(
    private readonly fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: this.fb.control(null, [Validators.required, Validators.email]),
      password: this.fb.control(null, [Validators.required])
    })
  }

  goToPasswordStep(): void {}

  onSubmit(): void {}



}
