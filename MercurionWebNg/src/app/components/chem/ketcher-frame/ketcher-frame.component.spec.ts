import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KetcherFrameComponent } from './ketcher-frame.component';

describe('KetcherFrameComponent', () => {
  let component: KetcherFrameComponent;
  let fixture: ComponentFixture<KetcherFrameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KetcherFrameComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KetcherFrameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('mobile keyboard guard idempotency', () => {
    let fakeDoc: any;
    let addEventListenerSpy: jasmine.Spy;
    let removeEventListenerSpy: jasmine.Spy;
    let observeSpy: jasmine.Spy;
    let disconnectSpy: jasmine.Spy;
    let matchMediaSpy: jasmine.Spy;

    beforeEach(() => {
      addEventListenerSpy = jasmine.createSpy('addEventListener');
      removeEventListenerSpy = jasmine.createSpy('removeEventListener');
      observeSpy = jasmine.createSpy('observe');
      disconnectSpy = jasmine.createSpy('disconnect');

      fakeDoc = {
        defaultView: window,
        documentElement: {},
        querySelectorAll: () => [] as any,
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy
      };

      (component as any).iframeRef = { nativeElement: { contentDocument: fakeDoc } };

      matchMediaSpy = spyOn(window, 'matchMedia').and.returnValue({ matches: true } as any);

      const FakeMutationObserver: any = function (this: any) {
        this.observe = observeSpy;
        this.disconnect = disconnectSpy;
      };
      (window as any).__origMutationObserver = (window as any).MutationObserver;
      (window as any).MutationObserver = FakeMutationObserver;
    });

    afterEach(() => {
      (window as any).MutationObserver = (window as any).__origMutationObserver;
    });

    it('a second call disconnects the previous MutationObserver and removes the previous focusin listener before installing new ones (no duplicate registration)', () => {
      (component as any).installMobileKeyboardGuard();

      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
      expect(observeSpy).toHaveBeenCalledTimes(1);
      expect(disconnectSpy).not.toHaveBeenCalled();
      expect(removeEventListenerSpy).not.toHaveBeenCalled();

      // Simulate a remount: ketcherReady fires again on the same component
      // instance without a full component destroy in between.
      (component as any).installMobileKeyboardGuard();

      // The stale MutationObserver/listener from the first call must be torn
      // down exactly once before the second registration is created.
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
      expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
      expect(observeSpy).toHaveBeenCalledTimes(2);
    });

    it('ngOnDestroy tears down the active MutationObserver and focusin listener exactly once', () => {
      (component as any).installMobileKeyboardGuard();
      expect(disconnectSpy).not.toHaveBeenCalled();

      fixture.destroy();

      expect(disconnectSpy).toHaveBeenCalledTimes(1);
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
    });
  });
});