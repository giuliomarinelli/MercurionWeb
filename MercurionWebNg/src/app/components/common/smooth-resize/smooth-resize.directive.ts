import { AfterViewInit, DestroyRef, Directive, ElementRef, Injectable, Injector, NgZone, effect, inject, input } from '@angular/core';
import { ViewportRuntimeService } from '../../../services/context/viewport-runtime.service';

interface Size { width: number; height: number }

/** Keeps the action shell's last size when its projected action is replaced. */
@Injectable()
export class SmoothResizeState {
  readonly sizes = new Map<string, Size>();
}

@Directive({ selector: '[mSmoothResize]' })
export class SmoothResizeDirective implements AfterViewInit {
  readonly mSmoothResize = input<'height' | 'both'>('height');
  readonly resizeKey = input('');
  private readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly shared = inject(SmoothResizeState, { optional: true });
  private readonly viewport = inject(ViewportRuntimeService);
  private readonly injector = inject(Injector);

  ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.zone.runOutsideAngular(() => {
      const element = this.element;
      const readSize = (): Size => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      };
      let previous = this.shared?.sizes.get(this.resizeKey()) ?? readSize();
      let animation: Animation | undefined;
      let frame = 0;
      let contentChanged = false;
      const originalOverflow = element.style.overflow;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      let viewportChanged = false;
      let geometry = '';
      const remember = (size: Size) => {
        previous = size;
        if (this.resizeKey()) this.shared?.sizes.set(this.resizeKey(), size);
      };

      const update = () => {
        frame = 0;
        if (!element.isConnected || (animation && !contentChanged)) return;
        contentChanged = false;
        const from = animation?.playState === 'running' ? readSize() : previous;
        animation?.cancel();
        animation = undefined;
        element.style.overflow = originalOverflow;
        const to = readSize();
        remember(to);
        // Keyboard/rotation geometry must settle immediately, including an in-flight animation.
        const state = this.viewport.state();
        const keyboardVisible = state.height - state.visualHeight * state.scale > 120;
        if (viewportChanged || keyboardVisible) {
          viewportChanged = false;
          return;
        }
        // A child already animating its height makes this parent's layout move smoothly.
        if ([...element.querySelectorAll('[mSmoothResize]')].some(child =>
          child.getAnimations().some(active => active.playState === 'running'))) return;
        const both = this.mSmoothResize() === 'both';
        if (reducedMotion.matches || !element.animate || from.height === 0 || to.height === 0 ||
          (Math.abs(from.height - to.height) < 1 && (!both || Math.abs(from.width - to.width) < 1))) return;

        element.style.overflow = 'hidden';
        const current = element.animate([
          { height: `${from.height}px`, ...(both ? {
            width: `${from.width}px`, transform: `translateX(${(to.width - from.width) / 2}px)`
          } : {}) },
          { height: `${to.height}px`, ...(both ? { width: `${to.width}px`, transform: 'translateX(0)' } : {}) }
        ], { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
        animation = current;
        current.onfinish = () => {
          if (animation !== current) return;
          animation = undefined;
          element.style.overflow = originalOverflow;
          // Keep the target of this animation: a new layout change may already
          // have happened before onfinish, and must animate from that target.
          remember(to);
          schedule();
        };
      };
      const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
      effect(() => {
        const state = this.viewport.state();
        const nextGeometry = `${state.width}:${state.height}:${state.visualWidth}:${state.visualHeight}:${state.scale}`;
        if (geometry && geometry !== nextGeometry) {
          viewportChanged = true;
          animation?.cancel();
          animation = undefined;
          element.style.overflow = originalOverflow;
          remember(readSize());
          schedule();
        }
        geometry = nextGeometry;
      }, { injector: this.injector });
      // Ignore our animated geometry; measure natural layout again only when content changes.
      const resize = new ResizeObserver(schedule);
      const mutations = new MutationObserver(records => {
        // Our overflow changes must not restart the animation. Child constraints can
        // change while it runs even when Angular keeps the same content nodes.
        if (!records.some(record => record.type !== 'attributes' || record.target !== element)) return;
        contentChanged = true;
        schedule();
      });
      resize.observe(element);
      mutations.observe(element, {
        childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ['class', 'style']
      });
      schedule();

      this.destroyRef.onDestroy(() => {
        const final = readSize();
        if (final.width > 0 && final.height > 0) remember(final);
        resize.disconnect();
        mutations.disconnect();
        cancelAnimationFrame(frame);
        animation?.cancel();
        element.style.overflow = originalOverflow;
      });
    });
  }
}
