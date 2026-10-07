import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoleculeEditorPageComponent } from './molecule-editor.page.component';
import { KetcherFrameComponent } from '../../components/chem/ketcher-frame/ketcher-frame.component';

describe('Molecule editor layout and mode context', () => {
  let fixture: ComponentFixture<MoleculeEditorPageComponent>;
  let frame: HTMLIFrameElement | undefined;
  beforeEach(async () => {
    spyOn(MoleculeEditorPageComponent.prototype, 'ngOnInit');
    spyOn(KetcherFrameComponent.prototype, 'ngOnInit');
    await TestBed.configureTestingModule({ imports: [MoleculeEditorPageComponent] }).compileComponents();
    fixture = TestBed.createComponent(MoleculeEditorPageComponent);
    fixture.componentInstance.mode.set('create');
    fixture.detectChanges();
  });
  afterEach(() => { fixture.destroy(); frame?.remove(); });
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
});
