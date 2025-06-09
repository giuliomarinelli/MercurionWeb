import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-btest',
  imports: [JsonPipe],
  template: `

  <p>{{res() | json}}</p>

  `
})
export class BtestComponent implements OnInit, OnDestroy {

  private testSub?: Subscription
  res = signal<any>({})

  constructor(private readonly authService: AuthService) { }

  ngOnInit(): void {
    this.testSub = this.authService.backendTest().subscribe({
      next: res => {
        this.res.set(res)
      },
      error: err => {
        this.res.set(err)
      }
    })
  }

  ngOnDestroy(): void {
    this.testSub?.unsubscribe()
  }

}
