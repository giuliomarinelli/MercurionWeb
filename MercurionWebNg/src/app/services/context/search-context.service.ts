import { DestroyRef, Injectable, signal } from '@angular/core';
import { MountedVisibleTransitionController } from './mounted-visible-transition.controller';

@Injectable({
  providedIn: 'root'
})
export class SearchContextService {
  private readonly transition = new MountedVisibleTransitionController();

  private readonly openedSearchOverlayState = signal(false);
  readonly isOpenedSearchOverlay = this.openedSearchOverlayState.asReadonly();
  readonly isMounted = this.transition.isMounted;
  readonly isVisible = this.transition.isVisible;

  constructor(destroyRef: DestroyRef) {
    destroyRef.onDestroy(() => this.transition.destroy());
  }

  open(): void {
    this.openedSearchOverlayState.set(true);
    this.transition.open();
  }

  close(): void {
    this.openedSearchOverlayState.set(false);
    this.transition.close();
  }
}
