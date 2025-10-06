import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { Subscription } from 'rxjs';
import { filter, map, take, tap } from 'rxjs/operators';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [],
  template: `
    @if (canView()) {
      can view!
    }
  `
})
export class PasswordRecoveryComponent implements OnInit, OnDestroy {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountService = inject(AccountService);



  private authSub?: Subscription;
  private paramSub?: Subscription;

  // signals
  error = signal(false);
  canView = signal(false);

  private changePasswordToken = signal<string>('');

  private sanitizeToken(raw: string) {
    // decode + rimuovi spazi, NBSP, zero-width, ecc.
    return decodeURIComponent(raw).replace(/[\s\u00A0\u200B-\u200D\uFEFF]/g, '');
  }
  private isValidJwt(t: string) {
    return /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){2}$/.test(t);
  }

  ngOnInit(): void {
    const raw = this.route.snapshot.queryParamMap.get('t') ?? '';
    const t = this.sanitizeToken(raw);
    if (!t || !this.isValidJwt(t)) {
      this.router.navigateByUrl('/')
      return
    }

    this.changePasswordToken.set(t);
    this.authSub = this.accountService.isAuthorizedToRecoverPassword(t)
      .subscribe({
        next: ok => ok ? this.canView.set(true) : this.router.navigateByUrl('/'),
        error: () => this.router.navigateByUrl('/')
      });
  }


  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.paramSub?.unsubscribe();
  }
}
