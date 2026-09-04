import { signal, Signal } from '@angular/core';

export const MOUNTED_VISIBLE_TRANSITION_SHOW_DELAY = 10;
export const MOUNTED_VISIBLE_TRANSITION_UNMOUNT_DELAY = 300;

/**
 * Coordinates the mounted/visible lifecycle shared by delayed overlays.
 * Each intent invalidates all work scheduled by an earlier intent.
 */
export class MountedVisibleTransitionController {
  private readonly mountedState = signal(false);
  private readonly visibleState = signal(false);
  private showTimer: ReturnType<typeof setTimeout> | undefined;
  private unmountTimer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;

  readonly isMounted: Signal<boolean> = this.mountedState.asReadonly();
  readonly isVisible: Signal<boolean> = this.visibleState.asReadonly();

  open(): void {
    const generation = ++this.generation;
    this.clearTimers();
    this.mountedState.set(true);
    this.visibleState.set(false);
    this.showTimer = setTimeout(() => {
      if (generation === this.generation) {
        this.visibleState.set(true);
      }
    }, MOUNTED_VISIBLE_TRANSITION_SHOW_DELAY);
  }

  close(): void {
    const generation = ++this.generation;
    this.clearTimers();
    this.visibleState.set(false);
    this.unmountTimer = setTimeout(() => {
      if (generation === this.generation) {
        this.mountedState.set(false);
        this.visibleState.set(false);
      }
    }, MOUNTED_VISIBLE_TRANSITION_UNMOUNT_DELAY);
  }

  destroy(): void {
    ++this.generation;
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.showTimer !== undefined) {
      clearTimeout(this.showTimer);
      this.showTimer = undefined;
    }
    if (this.unmountTimer !== undefined) {
      clearTimeout(this.unmountTimer);
      this.unmountTimer = undefined;
    }
  }
}
