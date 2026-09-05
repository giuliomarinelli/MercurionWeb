import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChemistryEditorSession } from '../../../chemistry/chemistry-adapter.models';
import { ChemistryEditorService } from '../../../chemistry/chemistry-editor.service';
import { KetcherFrameComponent } from './ketcher-frame.component';

describe('KetcherFrameComponent', () => {
  let component: KetcherFrameComponent;
  let fixture: ComponentFixture<KetcherFrameComponent>;
  let editor: jasmine.SpyObj<ChemistryEditorService>;
  let session: jasmine.SpyObj<ChemistryEditorSession>;

  beforeEach(async () => {
    session = jasmine.createSpyObj<ChemistryEditorSession>(
      'ChemistryEditorSession',
      ['attach', 'onStateChange', 'setStructure', 'exportStructure', 'dispose'],
      { resourceUrl: '/ketcher/index.html' }
    );
    session.onStateChange.and.callFake(listener => {
      listener({ status: 'loading' });
      return () => undefined;
    });
    editor = jasmine.createSpyObj<ChemistryEditorService>('ChemistryEditorService', ['createSession']);
    editor.createSession.and.resolveTo(session);

    await TestBed.configureTestingModule({
      imports: [KetcherFrameComponent],
      providers: [{ provide: ChemistryEditorService, useValue: editor }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KetcherFrameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await Promise.resolve();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(editor.createSession).toHaveBeenCalledTimes(1);
  });

  it('disposes the application editor session on destroy', () => {
    fixture.destroy();
    expect(session.dispose).toHaveBeenCalledTimes(1);
  });

  it('shows a controlled state and permits retry when the lazy adapter fails', async () => {
    editor.createSession.and.rejectWith(new Error('vendor detail'));

    component.retry();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(component.editorState()).toBe('unavailable');
    expect(component.editorError()).toBe('L’editor molecolare non è disponibile.');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
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

      (component as any).iframe = { contentDocument: fakeDoc };

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