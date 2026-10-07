import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { MoleculeDetailPageComponent } from './molecule-detail.page.component';
import { MoleculeDetailFacade } from './molecule-detail.facade';
import { MoleculeDetailItem } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { UserContextService } from '../../services/context/user-context.service';
import { PcpApiService } from '../../services/pcp-api.service';
import { ChemistryRendererService } from '../../chemistry/chemistry-renderer.service';

const longSmiles = 'CC(C)N1CCN(c2ccc(OC3COC(Cn4cncn4)(c4ccc(Cl)cc4Cl)CO3)cc2)CC1'.repeat(4);
const longIupac = '1-[4-[[2-(2,4-dichlorophenyl)-2-(1,2,4-triazol-1-ylmethyl)-1,3-dioxolan-4-yl]methoxy]phenyl]'.repeat(3);
const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

describe('Molecule detail in phone and tablet viewports', () => {
  let fixture: ComponentFixture<MoleculeDetailPageComponent>;
  let frame: HTMLIFrameElement;
  let frameDocument: Document;
  let deleteSpy: jasmine.Spy;
  let bindSpy: jasmine.Spy;

  afterEach(() => {
    fixture?.destroy();
    frame?.remove();
  });

  async function render(type: 'custom' | 'chembl' | 'system', width: number, height = 800, iupac = longIupac) {
    const details = {
      id: 1714574, preferredName: 'TERCONAZOLO', preferredNameIt: null, cmbId: 'CHEMBL1714574',
      canonicalSmiles: longSmiles, synonyms: [], moleculeType: null, maxPhase: 4,
      naturalProduct: false, prodrug: false, blackBoxWarning: false,
      administrationRoutes: { oral: false, parenteral: false, topical: true },
      properties: { mwFreebase: 532.5, alogp: 2, hba: 5, hbd: 0, psa: 40, rtb: 7 }
    };
    const base = {
      id: 'molecule-1', joins: [], touchedAt: '',
      label: 'Etichetta'.repeat(20), notes: 'Note senza spazi'.repeat(30)
    };
    const molecule: MoleculeDetailItem = type === 'system' ? { ...details, type }
      : type === 'chembl' ? { ...base, type, chemblMolregno: 1714574, chemblDetails: details }
      : { ...base, type, name: 'Prova 1', canonicalSmiles: longSmiles };
    const getIupac = jasmine.createSpy('getIupac').and.returnValue(of(iupac));
    if (iupac === '__ERROR__') getIupac.and.returnValues(throwError(() => new Error('offline')), of('Recovered IUPAC'));
    deleteSpy = jasmine.createSpy('delete');
    bindSpy = jasmine.createSpy('bindCollections');
    const facade = {
      molecule$: of(molecule), molecule: signal(molecule), toViewModel: () => ({ smiles: longSmiles }),
      currentName: signal('Prova 1'), currentId: signal('molecule-1'),
      loading: signal(false), error: signal(false), similar: signal([]), similarLoading: signal(false),
      collectionId: signal('collection-1'), collectionName: signal('Collezione'.repeat(20)),
      save: jasmine.createSpy('save'), deletePending: signal(false), deleteError: signal(''), delete: deleteSpy, bindCollections: bindSpy
    };
    await TestBed.configureTestingModule({
      imports: [MoleculeDetailPageComponent],
      providers: [
        { provide: UserContextService, useValue: { isLoggedIn: () => true } },
        { provide: PcpApiService, useValue: { getIupacNameFromSmiles: getIupac } },
        { provide: ChemistryRendererService, useValue: { createSession: async () => ({
          renderSvg: async () => '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L1000 100" /></svg>',
          dispose: () => undefined
        }) } }
      ]
    }).overrideComponent(MoleculeDetailPageComponent, {
      set: { providers: [{ provide: MoleculeDetailFacade, useValue: facade }] }
    }).compileComponents();
    fixture = TestBed.createComponent(MoleculeDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    // Wait for the viewer's scheduled render, not for any network request.
    for (let attempt = 0; attempt < 30 && !fixture.componentInstance.viewerReady(); attempt++) {
      await nextFrame();
      fixture.detectChanges();
    }
    expect(fixture.componentInstance.viewerReady()).toBeTrue();

    // An iframe supplies a real CSS viewport. Changing window.innerWidth alone
    // would not exercise the responsive rules or detect intrinsic-width overflow.
    frame = document.createElement('iframe');
    frame.style.cssText = `width:${width}px;height:${height}px;border:0;display:block`;
    document.body.appendChild(frame);
    frameDocument = frame.contentDocument!;
    const styles = frameDocument.createElement('style');
    styles.textContent = Array.from(document.styleSheets)
      .flatMap(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText)).join('\n');
    frameDocument.head.appendChild(styles);
    frameDocument.body.style.cssText = 'margin:0;padding:16px;box-sizing:border-box';
    frameDocument.body.appendChild(fixture.nativeElement);
    expect(frameDocument.documentElement.scrollWidth).withContext('loading skeleton overflow')
      .toBeLessThanOrEqual(frameDocument.documentElement.clientWidth);
    for (let attempt = 0; attempt < 30 && !frameDocument.querySelector('m-molecule-viewer svg'); attempt++) {
      await nextFrame();
      fixture.detectChanges();
    }
    fixture.detectChanges();
    await nextFrame();
  }

  function element<T extends Element = HTMLElement>(selector: string): T {
    return frameDocument.querySelector<T>(selector)!;
  }

  function assertContained() {
    const viewport = frameDocument.documentElement.clientWidth;
    expect(frameDocument.documentElement.scrollWidth).withContext('document overflow').toBeLessThanOrEqual(viewport);
    for (const node of frameDocument.querySelectorAll('h1, h2, p, button, m-molecule-badge')) {
      const bounds = node.getBoundingClientRect();
      expect(bounds.right).withContext(node.textContent?.trim() ?? node.tagName).toBeLessThanOrEqual(viewport + 1);
      expect(bounds.left).toBeGreaterThanOrEqual(0);
    }
    const svg = element<SVGSVGElement>('m-molecule-viewer svg');
    const bounds = svg.getBoundingClientRect();
    expect(bounds.right).toBeLessThanOrEqual(viewport);
    expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    // Both endpoints must fit: a clipped viewer could hide overflow without
    // actually showing the whole molecular structure.
    const path = svg.querySelector('path')!;
    const transform = path.getScreenCTM()!;
    for (const point of [new DOMPoint(0, 0), new DOMPoint(1000, 100)]) {
      const rendered = point.matrixTransform(transform);
      expect(rendered.x).toBeGreaterThanOrEqual(bounds.left);
      expect(rendered.x).toBeLessThanOrEqual(bounds.right);
    }
  }

  for (const width of [320, 375, 385, 639]) {
    for (const type of ['custom', 'chembl', 'system'] as const) {
      it(`contains the ${type} detail, long identifiers and structure at ${width}px`, async () => {
        await render(type, width);
        assertContained();
        const title = element('#molecule-name');
        expect(frame.contentWindow!.getComputedStyle(title).textAlign).toBe('left');
        const smiles = Array.from(frameDocument.querySelectorAll('h2')).find(node => node.textContent === 'SMILES canonico')!;
        const value = smiles.nextElementSibling!;
        expect(value.getBoundingClientRect().top).toBeGreaterThanOrEqual(smiles.getBoundingClientRect().bottom);
        const add = element<HTMLButtonElement>('button[title="Aggiungi ad una o più collezioni molecolari"]');
        expect(add.getBoundingClientRect().width).toBeLessThan(add.parentElement!.getBoundingClientRect().width);
        add.click();
        expect(bindSpy).toHaveBeenCalledTimes(1);
        if (type === 'custom') {
          const edit = element<HTMLButtonElement>('m-custom-details button[aria-label="Modifica"]');
          expect(edit.getBoundingClientRect().top).toBeLessThan(title.getBoundingClientRect().bottom);
          expect(edit.getBoundingClientRect().left).toBeGreaterThanOrEqual(title.getBoundingClientRect().right);
          element<HTMLButtonElement>('button[title="Elimina da tutte le collezioni"]').click();
          expect(deleteSpy).not.toHaveBeenCalled();
          fixture.detectChanges();
          element<HTMLButtonElement>('button[cdkFocusInitial]').click();
          fixture.detectChanges();
        }
      });
    }
  }

  for (const type of ['custom', 'chembl', 'system'] as const) {
    it(`keeps the ${type} name readable in phone landscape without actions squeezing it`, async () => {
      await render(type, 812, 375);
      assertContained();
      const title = element('#molecule-name');
      const lineHeight = parseFloat(frame.contentWindow!.getComputedStyle(title).lineHeight);
      expect(title.getBoundingClientRect().height).toBeLessThanOrEqual(lineHeight + 2);
      const add = element('button[title="Aggiungi ad una o pi\u00f9 collezioni molecolari"]');
      expect(add.getBoundingClientRect().top).toBeGreaterThanOrEqual(title.getBoundingClientRect().bottom);
    });
  }

  for (const width of [640, 812, 1024]) {
    it(`keeps identifier columns and row centers aligned at ${width}px`, async () => {
      await render('chembl', width);
      assertContained();
      const smiles = Array.from(frameDocument.querySelectorAll('h2')).find(node => node.textContent === 'SMILES canonico')!;
      const iupac = Array.from(frameDocument.querySelectorAll('h2')).find(node => node.textContent === 'Nome IUPAC Internazionale')!;
      const smilesValue = smiles.nextElementSibling!.getBoundingClientRect();
      const iupacValue = iupac.nextElementSibling!.getBoundingClientRect();
      expect(Math.abs(smilesValue.left - iupacValue.left)).toBeLessThan(1);
      for (const heading of [smiles, iupac]) {
        const title = heading.getBoundingClientRect();
        const value = heading.nextElementSibling!.getBoundingClientRect();
        expect(Math.abs((title.top + title.bottom) / 2 - (value.top + value.bottom) / 2)).toBeLessThan(1);
      }
    });
  }
  it('does not expose a copy action for unavailable IUPAC data', async () => {
    await render('custom', 375, 800, '');
    expect(frameDocument.body.textContent).toContain('Non disponibile');
    expect(frameDocument.querySelector('button[aria-label="Copia nome IUPAC"]')).toBeNull();
    expect(frameDocument.querySelector('button[aria-label="Copia SMILES canonico"]')).not.toBeNull();
  });

  it('distinguishes an IUPAC transport error and recovers on retry', async () => {
    await render('custom', 375, 800, '__ERROR__');
    const identifiers = element('.m-detail-identifiers');
    expect(identifiers.textContent).toContain('Impossibile recuperare il nome IUPAC');
    expect(identifiers.querySelector('button[aria-label="Copia nome IUPAC"]')).toBeNull();
    const retry = Array.from(identifiers.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Riprova')!;
    retry.click(); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(identifiers.textContent).toContain('Recovered IUPAC');
    expect(identifiers.querySelector('button[aria-label="Copia nome IUPAC"]')).not.toBeNull();
  });

});
