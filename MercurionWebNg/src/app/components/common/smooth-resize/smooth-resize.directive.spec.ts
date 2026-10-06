import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SmoothResizeDirective, SmoothResizeState } from './smooth-resize.directive';
import { ViewportRuntimeService } from '../../../services/context/viewport-runtime.service';

@Component({
  imports: [SmoothResizeDirective],
  template: '<div mSmoothResize style="width: 200px"><div [style.height.px]="height()"></div></div>'
})
class ResizeHost {
  readonly height = signal(40);
}

@Component({
  imports: [SmoothResizeDirective],
  providers: [SmoothResizeState],
  template: `@if (mounted()) {
    <div mSmoothResize="both" resizeKey="action" [style.width.px]="width()">
      <div [style.height.px]="height()"></div>
    </div>
  }`
})
class ShellHost {
  readonly mounted = signal(true);
  readonly width = signal(200);
  readonly height = signal(40);
}

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

describe('SmoothResizeDirective', () => {
  it('cancels an active content animation when the keyboard changes the viewport and keeps content scrollable', async () => {
    const state = signal({ width: 375, height: 812, visualWidth: 375, visualHeight: 812, scale: 1 });
    TestBed.configureTestingModule({ providers: [{ provide: ViewportRuntimeService, useValue: { state } }] });
    const fixture = TestBed.createComponent(ResizeHost);
    fixture.detectChanges();
    const element = fixture.nativeElement.firstElementChild as HTMLElement;
    await nextFrame();
    await nextFrame();
    fixture.componentInstance.height.set(160);
    fixture.detectChanges();
    await nextFrame();
    await nextFrame();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      expect(element.getAnimations().length).toBe(1);
    }
    state.update(value => ({ ...value, visualHeight: 300 }));
    fixture.detectChanges();
    await nextFrame();
    expect(element.getAnimations().length).toBe(0);
    expect(element.style.overflow).toBe('');
    expect(element.getBoundingClientRect().height).toBe(160);
    fixture.componentInstance.height.set(240);
    fixture.detectChanges();
    await nextFrame();
    await nextFrame();
    expect(element.getAnimations().length).toBe(0);
    expect(element.getBoundingClientRect().height).toBe(240);
    fixture.destroy();
  });

  it('preserves the previous shell size and animates both axes when its action is replaced', async () => {
    const fixture = TestBed.createComponent(ShellHost);
    fixture.detectChanges();
    await nextFrame();
    await nextFrame();
    fixture.componentInstance.mounted.set(false);
    fixture.detectChanges();
    fixture.componentInstance.width.set(320);
    fixture.componentInstance.height.set(160);
    fixture.componentInstance.mounted.set(true);
    fixture.detectChanges();
    await nextFrame();
    await nextFrame();
    const element = fixture.nativeElement.firstElementChild as HTMLElement;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const animation = element.getAnimations()[0];
      expect(animation).toBeTruthy();
      expect(element.getBoundingClientRect().width).toBeLessThan(320);
      expect(element.getBoundingClientRect().height).toBeLessThan(160);
      await animation.finished;
    }
    expect(element.getBoundingClientRect().width).toBe(320);
    expect(element.getBoundingClientRect().height).toBe(160);
    fixture.destroy();
  });

  it('animates a content resize, settles at the natural size and cleans up on destroy', async () => {
    const fixture = TestBed.createComponent(ResizeHost);
    fixture.detectChanges();
    const element = fixture.nativeElement.firstElementChild as HTMLElement;
    await nextFrame();
    await nextFrame();
    fixture.componentInstance.height.set(160);
    fixture.detectChanges();
    await nextFrame();
    await nextFrame();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      expect(element.getAnimations().length).toBe(1);
      expect(element.getBoundingClientRect().height).toBeLessThan(160);
      await element.getAnimations()[0].finished;
      await nextFrame();
      expect(element.getAnimations().length).toBe(0);
    }
    expect(element.getBoundingClientRect().height).toBe(160);
    expect(element.style.overflow).toBe('');

    fixture.componentInstance.height.set(80);
    fixture.detectChanges();
    await nextFrame();
    await nextFrame();
    fixture.destroy();
    expect(element.getAnimations().length).toBe(0);
    expect(element.style.overflow).toBe('');
  });
});
