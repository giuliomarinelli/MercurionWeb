import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-password-recovery',
  imports: [],
  template: `



  `
})
export class PasswordRecoveryComponent implements OnInit, OnDestroy {


  private readonly route = inject(ActivatedRoute)


  error = signal<boolean>(false)


  ngOnInit(): void {

  }

  ngOnDestroy(): void {

  }

}
