import { DOCUMENT } from '@angular/common';
import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { AddMoleculesToCollectionComponent } from './components/action-components/add-molecules-to-collection/add-molecules-to-collection.component';
import { DialogShellComponent } from './components/common/dialog-shell/dialog-shell.component';
import { SearchOverlayComponent } from './components/search-overlay/search-overlay/search-overlay.component';
import { SearchContextService } from './services/context/search-context.service';
import { UserContextService } from './services/context/user-context.service';
import { AddMoleculesToCollectionContextService } from './services/context/action-context/add-molecules-to-collection-context.service';
import { MoleculeCollectionService } from './services/graphql/molecule-collection.service';
import { MoleculeCollectionItemService } from './services/graphql/molecule-collection-item.service';
import { MoleculeSearchService } from './services/graphql/molecule-search.service';

@Component({
  imports: [DialogShellComponent, AddMoleculesToCollectionComponent],
  template: `<m-dialog-shell [mounted]="true" [open]="true" panelVariant="action" backdropVariant="action" label="Add molecules"><m-add-molecules-to-collection /></m-dialog-shell>`
})
class AddHost {
  readonly add = viewChild.required(AddMoleculesToCollectionComponent);
}

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const results = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1, smiles: 'CCC', preferredName: 'Molecule ' + index, preferredNameIt: null,
  synonyms: [], maxPhase: 4, mwFreebase: 44, alogp: null
}));

describe('Mobile overlay scrolling with the keyboard viewport', () => {
  let frame: HTMLIFrameElement;
  let fixture: ComponentFixture<AddHost | SearchOverlayComponent>;
  let doc: Document;
  let visual: EventTarget & { width: number; height: number; offsetTop: number; offsetLeft: number; scale: number };

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
    frame?.remove();
  });

  async function render(kind: 'search' | 'add', width: number, height: number) {
    frame = document.createElement('iframe');
    frame.style.cssText = `width:${width}px;height:812px;border:0;display:block`;
    document.body.appendChild(frame);
    doc = frame.contentDocument!;
    visual = Object.assign(new EventTarget(), { width, height, offsetTop: 20, offsetLeft: 0, scale: 1 });
    Object.defineProperty(frame.contentWindow!, 'visualViewport', { configurable: true, value: visual });
    doc.body.style.margin = '0';
    await TestBed.configureTestingModule({
      imports: [AddHost, SearchOverlayComponent],
      providers: [
        { provide: DOCUMENT, useValue: doc },
        { provide: UserContextService, useValue: { isLoggedIn: signal(true), isLoggedOut: signal(false) } },
        { provide: AddMoleculesToCollectionContextService, useValue: {
          collectionId: signal('collection-1'), importFromChembl: signal(true)
        } },
        { provide: MoleculeCollectionService, useValue: {
          getCollectionById: () => of({ id: 'collection-1', name: 'Test collection' })
        } },
        { provide: MoleculeCollectionItemService, useValue: {
          getAllPaginatedItems: () => NEVER, searchChemblMolecules_excludeAlreadyAdded: () => of(results)
        } },
        { provide: MoleculeSearchService, useValue: { searchMolecule: () => of(results) } }
      ]
    }).compileComponents();
    if (kind === 'search') TestBed.inject(SearchContextService).open();
    fixture = kind === 'search' ? TestBed.createComponent(SearchOverlayComponent) : TestBed.createComponent(AddHost);
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 20));
    fixture.detectChanges();
    if (kind === 'search') {
      (fixture.componentInstance as SearchOverlayComponent).chemblResults.set(results);
    } else {
      (fixture.componentInstance as AddHost).add().chemblResults.set(results);
    }
    fixture.detectChanges();
    const style = doc.createElement('style');
    style.textContent = Array.from(document.styleSheets)
      .flatMap(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText)).join('\n');
    doc.head.appendChild(style);
    doc.body.appendChild(fixture.nativeElement);
    await nextFrame();
    await nextFrame();
  }

  for (const kind of ['search', 'add'] as const) {
    for (const viewport of [{ width: 375, height: 350 }, { width: 375, height: 300 }, { width: 812, height: 200 }]) {
      it(`${kind} stays operable at ${viewport.width}x${viewport.height} with normal animations`, async () => {
        await render(kind, viewport.width, viewport.height);
        const dialog = doc.querySelector<HTMLElement>('[role="dialog"]')!;
        expect(dialog.getBoundingClientRect().top).toBeCloseTo(20, 0);
        expect(dialog.getBoundingClientRect().height).toBeCloseTo(viewport.height, 0);
        expect(frame.contentWindow!.getComputedStyle(doc.body).overflow).toBe('hidden');
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(viewport.width);
        const search = doc.querySelector<HTMLInputElement>('input:not([type=radio])')!;
        expect(search.getBoundingClientRect().height).toBeGreaterThanOrEqual(40);
        const methods = doc.querySelector<HTMLElement>('.m-overlay-methods')!;
        const choices = methods.querySelectorAll('label');
        expect(choices[0].getBoundingClientRect().top).withContext('sources share one row')
          .toBeCloseTo(choices[1].getBoundingClientRect().top, 0);
        expect(methods.getBoundingClientRect().height).toBeLessThanOrEqual(54);
        const scroll = doc.querySelector<HTMLElement>(kind === 'search' ? '.m-search-panel [class*="overflow-y-auto"]' : 'section.m-action-card')!;
        const header = doc.querySelector<HTMLElement>(kind === 'search' ? '.m-search-header' : '.m-action-card__header')!;
        const headerTop = header.getBoundingClientRect().top;
        scroll.scrollTop = scroll.scrollHeight;
        await nextFrame();
        expect(header.getBoundingClientRect().top).withContext('close control stays reachable').toBeCloseTo(headerTop, 0);
        if (kind === 'search') {
          expect(scroll.clientHeight).withContext('usable results area').toBeGreaterThanOrEqual(viewport.width < 640 ? 96 : 64);
          expect(search.getBoundingClientRect().bottom).toBeLessThan(scroll.getBoundingClientRect().top);
        } else {
          const submit = doc.querySelector<HTMLButtonElement>('[aria-label="Aggiungi molecole"]')!;
          expect(submit.getBoundingClientRect().bottom).withContext('submit reachable by scrolling').toBeLessThanOrEqual(scroll.getBoundingClientRect().bottom + 1);
          expect(doc.querySelector('.m-add-selections')).toBeNull();
          const component = (fixture.componentInstance as AddHost).add();
          component.addChip({ id: '1', name: 'Molecule 0' });
          fixture.detectChanges();
          const selections = doc.querySelector<HTMLDetailsElement>('.m-add-selections')!;
          expect(selections.open).toBeFalse();
          expect(selections.querySelector('summary')!.textContent).toContain('1');
          selections.open = true;
          (selections.querySelector('button') as HTMLButtonElement).click();
          fixture.detectChanges();
          expect(doc.querySelector('.m-add-selections')).toBeNull();
        }
        visual.height = 700;
        visual.offsetTop = 0;
        visual.dispatchEvent(new Event('resize'));
        await Promise.resolve();
        fixture.detectChanges();
        await nextFrame();
        expect(dialog.getBoundingClientRect().height).toBeCloseTo(700, 0);
        expect(dialog.classList.contains('m-dialog--compact')).toBeFalse();
      });
    }
  }
});
