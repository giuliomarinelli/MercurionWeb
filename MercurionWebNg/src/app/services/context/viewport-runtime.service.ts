import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { BrowserResourceOwner } from '../../utils/browser-resource-owner.util';

export interface ViewportRuntimeState {
  readonly width: number;
  readonly height: number;
  readonly visualWidth: number;
  readonly visualHeight: number;
  readonly scale: number;
  readonly scrollY: number;
  readonly landscape: boolean;
}

/**
 * The single owner of application-wide viewport and window-scroll measurements.
 *
 * CSS remains responsible for presentation breakpoints. This adapter exists
 * only for JavaScript that must measure the runtime viewport or global scroll.
 */
@Injectable({ providedIn: 'root' })
export class ViewportRuntimeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly resources = new BrowserResourceOwner();
  private readonly _state = signal<ViewportRuntimeState>(this.readState());
  private readonly _width = signal(0);
  private readonly _height = signal(0);
  private readonly _visualWidth = signal(0);
  private readonly _visualHeight = signal(0);
  private readonly _scale = signal(1);
  private readonly _scrollY = signal(0);
  private queued = false;

  readonly state = this._state.asReadonly();
  readonly width = this._width.asReadonly();
  readonly height = this._height.asReadonly();
  readonly visualWidth = this._visualWidth.asReadonly();
  readonly visualHeight = this._visualHeight.asReadonly();
  readonly scale = this._scale.asReadonly();
  readonly scrollY = this._scrollY.asReadonly();

  constructor() {
    this.syncState();
    const win = this.document.defaultView;
    if (!win) {
      this.destroyRef.onDestroy(() => this.resources.dispose());
      return;
    }

    const scheduleSync = () => {
      if (this.queued) return;
      this.queued = true;
      queueMicrotask(() => {
        this.queued = false;
        this.syncState();
      });
    };

    this.resources.addEventListener(win, 'resize', scheduleSync, { passive: true });
    this.resources.addEventListener(win, 'orientationchange', scheduleSync, { passive: true });
    this.resources.addEventListener(win, 'scroll', scheduleSync, { passive: true });
    this.resources.addEventListener(win.visualViewport ?? win, 'resize', scheduleSync, { passive: true });
    this.resources.addEventListener(win.visualViewport ?? win, 'scroll', scheduleSync, { passive: true });
    this.destroyRef.onDestroy(() => this.resources.dispose());
  }

  isNearBottom(scrollRoot?: HTMLElement | null, threshold = 500): boolean {
    if (scrollRoot) {
      return scrollRoot.scrollTop + scrollRoot.clientHeight >= scrollRoot.scrollHeight - threshold;
    }

    const doc = this.document;
    const root = doc.documentElement;
    const body = doc.body;
    const scrollTop = this.scrollY();
    const contentHeight = Math.max(root?.scrollHeight ?? 0, body?.scrollHeight ?? 0);
    return scrollTop + this.height() >= contentHeight - threshold;
  }

  private readState(): ViewportRuntimeState {
    const win = this.document.defaultView;
    const root = this.document.documentElement;
    const visual = win?.visualViewport;
    const width = win?.innerWidth ?? root?.clientWidth ?? 0;
    const height = win?.innerHeight ?? root?.clientHeight ?? 0;
    const visualWidth = visual?.width ?? width;
    const visualHeight = visual?.height ?? height;
    const scrollY = win?.scrollY ?? root?.scrollTop ?? this.document.body?.scrollTop ?? 0;

    return {
      width,
      height,
      visualWidth,
      visualHeight,
      scale: visual?.scale ?? 1,
      scrollY,
      landscape: height > 0 ? width >= height : false,
    };
  }

  private syncState(): void {
    const state = this.readState();
    this._state.set(state);
    this._width.set(state.width);
    this._height.set(state.height);
    this._visualWidth.set(state.visualWidth);
    this._visualHeight.set(state.visualHeight);
    this._scale.set(state.scale);
    this._scrollY.set(state.scrollY);

    const win = this.document.defaultView;
    const root = this.document.documentElement;
    if (!win || !root) return;

    const ua = win.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in this.document);
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIOS && isSafari) {
      root.style.setProperty('--app-vh', `${state.visualHeight * 0.01}px`);
    }
  }
}
