import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoleculeEditorPageComponent } from './molecule-editor.page.component';
import { KetcherFrameComponent } from '../../components/chem/ketcher-frame/ketcher-frame.component';
import { Observable, Subject } from 'rxjs';
import { MoleculeService } from '../../services/graphql/molecule.service';
import { EditorRequestScheduler } from '../../chemistry/editor-request-scheduler.service';
import { LoggerService } from '../../services/logger.service';
import { signal } from '@angular/core';

describe('Molecule editor layout and mode context', () => {
  let fixture: ComponentFixture<MoleculeEditorPageComponent>;
  let frame: HTMLIFrameElement | undefined;
  let nameResult: Subject<{ name: string | null; type: 'iupac' }>;
  beforeEach(async () => {
    spyOn(MoleculeEditorPageComponent.prototype, 'ngOnInit');
    spyOn(KetcherFrameComponent.prototype, 'ngOnInit');
    nameResult = new Subject();
    await TestBed.configureTestingModule({
      imports: [MoleculeEditorPageComponent],
      providers: [
        { provide: MoleculeService, useValue: { getPreferredNameItByCanonicalSmiles: () => nameResult } },
        { provide: LoggerService, useValue: { error: jasmine.createSpy('error') } },
        { provide: EditorRequestScheduler, useValue: { waiting: signal(null), run: <T>(_route: string, request: () => Observable<T>) => request() } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(MoleculeEditorPageComponent);
    fixture.componentInstance.mode.set('create');
    fixture.detectChanges();
  });

  it('explains unchanged edits and connects the save control to its status', () => {
    const component = fixture.componentInstance;
    component.mode.set('edit');
    component.hasStructure.set(true);
    component.currentCanonicalSmiles.set('CC');
    component.duplicateFound.set(true);
    component.untouched.set(true);
    fixture.detectChanges();
    nameResult.next({ name: 'Test', type: 'iupac' });
    fixture.detectChanges();
    expect(component.editorStatus().text).toBe('Nessuna modifica da salvare');
    expect(fixture.nativeElement.querySelector('[aria-label="Salva molecola"]').getAttribute('aria-describedby')).toBe('editor-state-message');
  });
  afterEach(() => { fixture.destroy(); frame?.remove(); });
  it('renders admission waits in the reserved footer and clears them on completion', () => {
    const component = fixture.componentInstance;
    component.hasStructure.set(true);
    component.currentCanonicalSmiles.set('CC');
    fixture.detectChanges();
    nameResult.next({ name: null, type: 'iupac' });
    const waiting = TestBed.inject(EditorRequestScheduler).waiting;
    const positions: number[] = [];
    for (const kind of ['queued', 'lock', 'cooldown', null] as const) {
      waiting.set(kind ? { kind, resumeAt: Date.now() + 5000 } : null);
      fixture.detectChanges();
      const status = fixture.nativeElement.querySelector('.m-editor-status');
      expect(component.editorStatus().kind).toBe(kind ? 'busy' : 'ready');
      if (kind === 'cooldown') expect(status.textContent).toContain('Ripresa alle');
      if (kind === 'lock') expect(status.textContent).toContain('un’altra scheda');
      positions.push(fixture.nativeElement.querySelector('.m-editor-actions').getBoundingClientRect().top);
    }
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(1);
  });
  for (const missingName of [null, '']) {
  it(`ends the name spinner when the lookup succeeds with ${JSON.stringify(missingName)}`, () => {
    const component = fixture.componentInstance;
    const name = () => fixture.nativeElement.querySelector('.m-editor-name dd') as HTMLElement;
    expect(name().textContent).toContain('Nessuna struttura disegnata');
    expect(name().querySelector('m-progress-indicator')).toBeNull();

    component.hasStructure.set(true);
    component.identityChecking.set(true);
    fixture.detectChanges();
    expect(name().querySelector('m-progress-indicator')).not.toBeNull();

    component.currentCanonicalSmiles.set('CCCC');
    component.identityChecking.set(false);
    fixture.detectChanges();
    expect(component.moleculeNameLoading()).toBeTrue();
    expect(name().querySelector('m-progress-indicator')).not.toBeNull();
    expect(name().textContent).not.toContain('Nome non disponibile');

    nameResult.next({ name: missingName, type: 'iupac' });
    nameResult.complete();
    fixture.detectChanges();
    expect(component.moleculeNameLoading()).toBeFalse();
    expect(component.editorStatus().kind).toBe('ready');
    expect(name().querySelector('m-progress-indicator')).toBeNull();
    expect(name().querySelector('m-molecule-badge')).toBeNull();
    expect(name().textContent).toContain('Nome non disponibile');
  });
  }

  it('shows a name lookup failure with retry instead of a spinner or missing-name placeholder', () => {
    const component = fixture.componentInstance;
    component.hasStructure.set(true);
    component.currentCanonicalSmiles.set('CCCC');
    fixture.detectChanges();
    nameResult.error(new Error('Name service unavailable'));
    fixture.detectChanges();
    const name = fixture.nativeElement.querySelector('.m-editor-name dd');
    expect(name.querySelector('m-progress-indicator')).toBeNull();
    expect(name.textContent).toContain('Ricerca del nome non riuscita');
    expect(name.textContent).not.toContain('Nome non disponibile');
    expect(component.editorStatus().kind).toBe('error');
    TestBed.inject(EditorRequestScheduler).waiting.set({ kind: 'lock', resumeAt: 0 });
    fixture.detectChanges();
    expect(component.editorStatus().kind).toBe('error');
    expect(fixture.nativeElement.querySelector('.m-editor-status-retry').disabled).toBeFalse();
  });
  for (const mode of ['create', 'edit', 'duplicate'] as const) {
    it(`keeps the ${mode} context visible when switching to live analysis`, () => {
      fixture.componentInstance.mode.set(mode); fixture.componentInstance.tab.set('live'); fixture.detectChanges();
      const heading = fixture.nativeElement.querySelector('h1');
      expect(heading.textContent).toBe(fixture.componentInstance.modeTitle());
      expect(fixture.nativeElement.querySelector('aside')).not.toBeNull();
      const action = fixture.nativeElement.querySelector('.m-editor-action--primary');
      expect(action.textContent.trim()).toBe(mode === 'edit' ? 'Salva modifiche' : 'Salva nuova molecola');
    });
  }
  for (const width of [320, 375, 768, 1024, 1366]) {
    it(`contains long identifiers, canvas and actions at ${width}px`, async () => {
      fixture.componentInstance.currentCanonicalSmiles.set('C1=CC=CC=C1'.repeat(30));
      fixture.componentInstance.currentMoleculeName.set('Un nome molecolare molto lungo '.repeat(8));
      fixture.componentInstance.tab.set('live'); fixture.detectChanges();
      frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:800px;border:0`;
      document.body.appendChild(frame);
      const doc = frame.contentDocument!;
      const style = doc.createElement('style');
      style.textContent = Array.from(document.styleSheets).flatMap(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText)).join('\n');
      doc.head.appendChild(style); doc.body.style.cssText = 'margin:0;padding:16px;box-sizing:border-box';
      doc.body.appendChild(fixture.nativeElement);
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const viewport = doc.documentElement.clientWidth;
      expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(viewport);
      for (const node of doc.querySelectorAll('.m-editor-identity, .m-ketcher-stage, .m-editor-action, aside')) {
        const bounds = node.getBoundingClientRect();
        expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(viewport);
      }
      for (const node of doc.querySelectorAll('.m-editor-action')) expect(node.getBoundingClientRect().height).toBeGreaterThanOrEqual(48);
      const workspace = doc.querySelector('.m-editor-workspace')!.getBoundingClientRect();
      const aside = doc.querySelector('aside')!.getBoundingClientRect();
      if (width < 960) expect(aside.top).toBeGreaterThanOrEqual(workspace.bottom);
      else expect(aside.left).toBeGreaterThan(workspace.right);
    });
  }
  for (const width of [320, 1024]) {
    it(`keeps the status footer and action positions stable across states at ${width}px`, async () => {
      const component = fixture.componentInstance;
      frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:800px;border:0`;
      document.body.appendChild(frame);
      const doc = frame.contentDocument!;
      const style = doc.createElement('style');
      style.textContent = Array.from(document.styleSheets).flatMap(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText)).join('\n');
      doc.head.appendChild(style); doc.body.style.cssText = 'margin:0;padding:16px;box-sizing:border-box';
      doc.body.appendChild(fixture.nativeElement);
      component.hasStructure.set(true);
      component.currentCanonicalSmiles.set('CC');
      fixture.detectChanges();
      nameResult.next({ name: 'Test', type: 'iupac' });
      const positions: number[] = [];
      for (const state of ['ready', 'busy', 'duplicate', 'error', 'ready']) {
        component.identityChecking.set(state === 'busy');
        component.duplicateFound.set(state === 'duplicate');
        component.validationFailed.set(state === 'error');
        fixture.detectChanges();
        expect(component.editorStatus().kind).toBe(state);
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const status = doc.querySelector('.m-editor-status')!;
        const actions = doc.querySelector('.m-editor-actions')!;
        expect(status.getBoundingClientRect().height).toBe(56);
        positions.push(actions.getBoundingClientRect().top);
        const retry = doc.querySelector<HTMLButtonElement>('.m-editor-status-retry')!;
        expect(retry.disabled).toBe(state !== 'error');
        expect(status.getBoundingClientRect().right).toBeLessThanOrEqual(doc.documentElement.clientWidth);
      }
      expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(1);
    });
  }
});
