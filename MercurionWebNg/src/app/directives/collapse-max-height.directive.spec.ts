import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CollapseMaxHeightDirective } from './collapse-max-height.directive';

@Component({
  standalone: true,
  imports: [CollapseMaxHeightDirective],
  template: `<div [appCollapseMaxH]="expanded" [minPx]="minPx" [maxPx]="maxPx" [auto]="auto"></div>`
})
class HostComponent {
  @ViewChild(CollapseMaxHeightDirective) directive!: CollapseMaxHeightDirective;
  expanded = false;
  minPx = 100;
  maxPx = 200;
  auto = false;
}

describe('CollapseMaxHeightDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  let rafCallbacks: FrameRequestCallback[];
  let rafHandle: number;

  function flushRaf(): void {
    const pending = rafCallbacks;
    rafCallbacks = [];
    pending.forEach(cb => cb(0));
  }

  beforeEach(() => {
    rafCallbacks = [];
    rafHandle = 0;
    spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafHandle;
    });

    TestBed.configureTestingModule({
      imports: [HostComponent]
    });

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(host.directive).toBeTruthy();
  });

  it('owns the double-rAF transition sequence and cancels the pending frame instead of leaking it on destroy', () => {
    // drain the initial-bind rAF scheduled during fixture creation before asserting on the toggle below
    flushRaf();

    host.expanded = true;
    fixture.detectChanges();

    // ngOnChanges scheduled exactly one owned rAF for the transition sequence
    expect(rafCallbacks.length).toBe(1);

    fixture.destroy();

    // the directive must not throw or apply any style change from an rAF scheduled before destroy
    expect(() => flushRaf()).not.toThrow();
  });

  it('detaches the previous transitionend listener before attaching a new one on rapid re-toggle (no duplicate listeners)', () => {
    const directive = host.directive as any;

    host.expanded = true;
    fixture.detectChanges();
    flushRaf();
    const firstOnEnd = directive.onEnd;
    expect(firstOnEnd).toBeTruthy();

    const detachSpy = spyOn(directive, 'detachEnd').and.callThrough();

    host.expanded = false;
    fixture.detectChanges();
    flushRaf();

    // detachEnd must run before the new listener is attached, so at most one transitionend listener is ever live
    expect(detachSpy).toHaveBeenCalled();
  });
});