import { Component, ChangeDetectionStrategy, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpErrorBody } from '../../Models/http-error-body.dto';

@Component({
  selector: 'm-admin-exchange-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JsonPipe],
  template: `{{res() | json}}`
})
export class AdminExchangePageComponent implements OnInit, OnDestroy {

  private readonly authService = inject(AuthService)
  private readonly route = inject(ActivatedRoute)
  protected res = signal<object>({})

  private sub?: Subscription

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') ?? ''
    this.sub = this.authService.skipMaintenanceMode(token).subscribe({
      next: (res) => this.res.set(res),
      error: (e: HttpErrorResponse) => {
        const body = e.error as HttpErrorBody
        this.res.set(body)
      }
    })
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe()
  }

}
