import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';

import { TermsAndPoliciesPageComponent } from './terms-and-policies.page.component';
import { AppContextService } from '../../services/context/app-context.service';

describe('TermsAndPoliciesPageComponent', () => {
  let component: TermsAndPoliciesPageComponent;
  let fixture: ComponentFixture<TermsAndPoliciesPageComponent>;
  let appContext: AppContextService;

  let rafCallbacks: FrameRequestCallback[];
  let rafHandle: number;
  let timeoutCallbacks: Array<() => void>;

  function flushRaf(): void {
    const pending = rafCallbacks;
    rafCallbacks = [];
    pending.forEach(cb => cb(0));
  }

  function flushTimeouts(): void {
    const pending = timeoutCallbacks;
    timeoutCallbacks = [];
    pending.forEach(cb => cb());
  }

  beforeEach(async () => {
    rafCallbacks = [];
    rafHandle = 0;
    timeoutCallbacks = [];
    spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafHandle;
    });
    spyOn(window, 'setTimeout').and.callFake(((cb: () => void) => {
      timeoutCallbacks.push(cb);
      return 0 as any;
    }) as any);

    await TestBed.configureTestingModule({
      imports: [TermsAndPoliciesPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TermsAndPoliciesPageComponent);
    component = fixture.componentInstance;
    appContext = TestBed.inject(AppContextService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('applies the fragment scroll once the header height becomes available (bounded, single owned RAF chain)', () => {
    const c = component as any;
    const fakeRoot = new ElementRef(document.createElement('div'));
    c.scrollRootRef = fakeRoot;
    c.termsHeaderRef = new ElementRef(document.createElement('div'));

    appContext.setHeaderHeight(0);
    const smoothToSpy = spyOn(appContext, 'smoothTo');
    spyOn(appContext, 'getScrollYRelativeToRoot').and.returnValue(100);

    c.applyFragment('terms');

    // first owned frame: header height still 0, must reschedule exactly one more bounded frame
    flushRaf();
    expect(smoothToSpy).not.toHaveBeenCalled();

    appContext.setHeaderHeight(40);
    // second owned frame: predicate now truthy, schedules the layout-settle frame
    flushRaf();
    // layout-settle frame: schedules the owned 20ms timeout
    flushRaf();
    flushTimeouts();

    expect(smoothToSpy).toHaveBeenCalledTimes(1);
  });

  it('cancels any pending owned frame/timer once destroyed, so a late header-height update can never trigger a scroll', () => {
    const c = component as any;
    const fakeRoot = new ElementRef(document.createElement('div'));
    c.scrollRootRef = fakeRoot;
    c.termsHeaderRef = new ElementRef(document.createElement('div'));

    appContext.setHeaderHeight(0);
    const smoothToSpy = spyOn(appContext, 'smoothTo');

    c.applyFragment('terms');
    expect(rafCallbacks.length).toBe(1);

    fixture.destroy();

    // even if the header height becomes available after destroy, no further frame/timer may fire
    appContext.setHeaderHeight(48);
    flushRaf();
    flushRaf();
    flushTimeouts();

    expect(smoothToSpy).not.toHaveBeenCalled();
  });
});