import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { AccountService } from '../../../services/account.service';
import { DomainInvalidationService } from '../../../services/domain-invalidation.service';
import { ProfileDTO } from '../../../Models/account/account.models';
import {
  toActivityViewModel,
  toMetricsViewModel,
  toWorkspaceCompositionViewModel
} from './dashboard-widget.mappers';
import { DashboardViewModel, DashboardWidgetState } from './dashboard-widget.models';

@Injectable()
export class DashboardFacade {
  private readonly accountService = inject(AccountService);
  private readonly invalidations = inject(DomainInvalidationService);
  private readonly destroyRef = inject(DestroyRef);
  private profileSubscription?: Subscription;

  readonly state = signal<DashboardWidgetState<DashboardViewModel>>({
    status: 'loading',
    value: null
  });

  constructor() {
    this.load();
    effect(() => {
      const event = this.invalidations.last();
      if (event?.domain === 'dashboard' && event.action === 'profile-changed') this.load();
    });
  }

  private load(): void {
    this.state.set({ status: 'loading', value: null });
    this.profileSubscription?.unsubscribe();
    this.profileSubscription = this.accountService.getProfileRegistry()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile: ProfileDTO) => this.state.set({
          status: 'content',
          value: {
            profile,
            metrics: toMetricsViewModel(profile),
            composition: toWorkspaceCompositionViewModel(profile),
            activity: toActivityViewModel(profile)
          }
        }),
        error: () => this.state.set({ status: 'error', value: null })
      });
  }
}
