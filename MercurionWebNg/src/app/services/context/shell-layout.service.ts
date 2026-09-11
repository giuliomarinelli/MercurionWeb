import { Injectable, signal } from '@angular/core';

/**
 * Owns shell geometry and semantic requests directed at shell chrome.
 * Scroll mechanics and domain invalidation belong elsewhere.
 */
@Injectable({ providedIn: 'root' })
export class ShellLayoutService {
  private readonly _headerHeight = signal(0);
  private readonly _closeOffCanvasRequest = signal(0);

  readonly headerHeight = this._headerHeight.asReadonly();
  readonly closeOffCanvasRequest = this._closeOffCanvasRequest.asReadonly();

  setHeaderHeight(height: number): void {
    this._headerHeight.set(height);
  }

  requestCloseOffCanvas(): void {
    this._closeOffCanvasRequest.update(value => value + 1);
  }
}
