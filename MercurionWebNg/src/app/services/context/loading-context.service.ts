import { DestroyRef, Injectable, signal } from '@angular/core';
import { MountedVisibleTransitionController } from './mounted-visible-transition.controller';

@Injectable({
  providedIn: 'root'
})
export class LoadingContextService {
  private readonly transition = new MountedVisibleTransitionController();

  private readonly appLoadingState = signal(false);
  readonly isAppLoading = this.appLoadingState.asReadonly();
  readonly isMounted = this.transition.isMounted;
  readonly isVisible = this.transition.isVisible;

  constructor(destroyRef: DestroyRef) {
    destroyRef.onDestroy(() => this.transition.destroy());
  }

  start(): void {
    this.appLoadingState.set(true);
    this.transition.open();
  }

  stop(): void {
    this.appLoadingState.set(false);
    this.transition.close();
  }
}
