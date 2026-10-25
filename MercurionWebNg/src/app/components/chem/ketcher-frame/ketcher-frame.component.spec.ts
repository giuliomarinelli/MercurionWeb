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

  it('ignores vendor changes while loading/restoring but reports interactive changes', async () => {
    let changed!: () => void;
    session.onStructureChange = listener => { changed = listener; return () => undefined; };
    component.retry();
    await Promise.resolve();
    const emitted = jasmine.createSpy('interactive change');
    component.structureChanged.subscribe(emitted);
    changed();
    expect(emitted).not.toHaveBeenCalled();
    component.editorState.set('ready');
    changed();
    expect(emitted).toHaveBeenCalledTimes(1);
    let restored!: () => void;
    session.setStructure.and.returnValue(new Promise(resolve => { restored = resolve; }));
    fixture.componentRef.setInput('smiles', 'CCO');
    fixture.detectChanges();
    changed();
    expect(emitted).toHaveBeenCalledTimes(1);
    restored();
    await Promise.resolve();
    changed();
    expect(emitted).toHaveBeenCalledTimes(2);
  });

  for (const editedDuringExport of [false, true]) {
    it(`binds a restored serialization only without intervening edits (${editedDuringExport})`, async () => {
      let state!: Parameters<ChemistryEditorSession['onStateChange']>[0];
      let changed!: () => void;
      let exported!: (smiles: string) => void;
      session.onStateChange.and.callFake(listener => { state = listener; return () => undefined; });
      session.onStructureChange = listener => { changed = listener; return () => undefined; };
      session.setStructure.and.resolveTo();
      session.exportStructure.and.returnValue(new Promise(resolve => { exported = resolve; }));
      fixture.componentRef.setInput('smiles', 'OCC');
      fixture.detectChanges();
      component.retry();
      await Promise.resolve();
      const restored = jasmine.createSpy('restored identity');
      component.structureRestored.subscribe(restored);
      state({ status: 'ready' });
      await Promise.resolve();
      if (editedDuringExport) changed();
      exported('C(C)O');
      await Promise.resolve();
      expect(component.editorState()).toBe('ready');
      if (editedDuringExport) expect(restored).not.toHaveBeenCalled();
      else expect(restored).toHaveBeenCalledOnceWith({ loadedSmiles: 'OCC', exportedSmiles: 'C(C)O' });
    });
  }

  it('creates the standalone editor with the standard Mercurion profile', () => {
    const resourceUrl = editor.createSession.calls.mostRecent().args[0];
    const url = new URL(resourceUrl, window.location.origin);

    const hiddenControls = url.searchParams.get('hiddenControls') ?? '';

    expect(url.searchParams.get('disableMacromoleculesEditor')).toBe('true');
    expect(hiddenControls).toContain('open');
    expect(hiddenControls).not.toContain('zoom-list');
  });

  it('recreates the session with the compact live-analysis profile when tab changes', async () => {
    fixture.componentRef.setInput('tab', 'live');
    fixture.detectChanges();
    await Promise.resolve();

    expect(editor.createSession).toHaveBeenCalledTimes(2);

    const resourceUrl = editor.createSession.calls.mostRecent().args[0];
    const url = new URL(resourceUrl, window.location.origin);
    const hiddenControls = url.searchParams.get('hiddenControls')?.split(',') ?? [];

    expect(hiddenControls).toContain('zoom-list');
    expect(hiddenControls).toContain('copies');
    expect(hiddenControls).not.toContain('clean');
  });

  it('disposes the application editor session on destroy', () => {
    fixture.destroy();
    expect(session.dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps reset baseline independent from working structure changes', () => {
    component.editorState.set('ready');
    fixture.componentRef.setInput('baselineSmiles', 'CCO');
    fixture.componentRef.setInput('smiles', 'CCN');
    fixture.detectChanges();

    session.setStructure.calls.reset();
    component.resetMolecule();

    expect(session.setStructure).toHaveBeenCalledOnceWith('CCO');
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

  it('discards an export started before a programmatic reset', async () => {
    component.editorState.set('ready');
    let complete!: (smiles: string) => void;
    session.exportStructure.and.returnValue(new Promise(resolve => { complete = resolve; }));
    const exported = jasmine.createSpy('exported');
    component.exportSmiles.subscribe(exported);
    component.requestExportSmiles();
    component.resetMolecule();
    complete('OLD');
    await Promise.resolve();
    await Promise.resolve();
    expect(exported).not.toHaveBeenCalled();
  });

  it('reports an export failure without destroying the drawing and accepts a later successful export', async () => {
    component.editorState.set('ready');
    session.exportStructure.and.rejectWith(new Error('export failed'));
    const failed = jasmine.createSpy('failed');
    const exported = jasmine.createSpy('exported');
    component.exportFailed.subscribe(failed);
    component.exportSmiles.subscribe(exported);
    component.requestExportSmiles();
    await Promise.resolve();
    await Promise.resolve();
    expect(failed).toHaveBeenCalledTimes(1);
    expect(component.editorState()).toBe('ready');
    expect(session.dispose).not.toHaveBeenCalled();
    session.exportStructure.and.resolveTo('CCO');
    component.requestExportSmiles();
    await Promise.resolve();
    expect(exported).toHaveBeenCalledOnceWith('CCO');
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
