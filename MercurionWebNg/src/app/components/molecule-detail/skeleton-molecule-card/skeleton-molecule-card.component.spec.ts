import { Component, input, output } from '@angular/core';
import { MoleculeSummaryCardComponent } from '../molecule-summary-card/molecule-summary-card.component';
import { MoleculeViewerComponent } from '../../chem/molecule-viewer/molecule-viewer.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkeletonMoleculeCardComponent } from './skeleton-molecule-card.component';

describe('SkeletonMoleculeCardComponent', () => {
  let component: SkeletonMoleculeCardComponent;
  let fixture: ComponentFixture<SkeletonMoleculeCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonMoleculeCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SkeletonMoleculeCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

@Component({ selector: 'm-molecule-viewer', template: '' })
class ViewerStub { readonly structure = input(''); readonly rendered = output<void>(); }

@Component({
  imports: [SkeletonMoleculeCardComponent, MoleculeSummaryCardComponent],
  template: `
    <m-skeleton-molecule-card [compact]="compact" [removeAction]="removeAction" />
    <m-molecule-summary-card [viewModel]="{
      source: 'saved', id: 'test', name: 'A long molecule name that needs more than one line',
      synonym: '', smiles: '', badge: 'Personal', createdAt: 1730000000000, actions: removeAction ? [{ kind: 'link', href: '/molecules/editor', icon: 'duplicate', label: 'Duplica' }, { kind: 'button', action: 'delete', icon: 'delete', label: 'Elimina' }, { kind: 'button', action: 'remove', icon: 'remove', label: 'Rimuovi dalla collezione' }] : [], selectable: false, compact: compact
    }" />
  `
})
class GeometryHost { compact = false; removeAction = false; }

describe('Molecule skeleton geometry', () => {
  for (const width of [360, 390, 768, 1366]) {
    for (const compact of [false, true]) {
      for (const removeAction of compact ? [false] : [false, true]) {
      it(`reserves the final card height at ${width}px, compact=${compact}, remove=${removeAction}`, async () => {
        await TestBed.configureTestingModule({ imports: [GeometryHost] })
          .overrideComponent(MoleculeSummaryCardComponent, { remove: { imports: [MoleculeViewerComponent] }, add: { imports: [ViewerStub] } }).compileComponents();
        const fixture = TestBed.createComponent(GeometryHost);
        fixture.componentInstance.compact = compact;
        fixture.componentInstance.removeAction = removeAction;
        fixture.detectChanges();
        const frame = document.createElement('iframe');
        frame.style.cssText = `width:${width}px;height:700px;border:0`;
        document.body.appendChild(frame);
        try {
          const doc = frame.contentDocument!;
          const style = doc.createElement('style');
          style.textContent = Array.from(document.styleSheets)
            .flatMap(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText)).join('\n');
          doc.head.appendChild(style);
          doc.body.style.cssText = 'margin:0;padding:16px';
          doc.body.appendChild(fixture.nativeElement);
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          const skeleton = doc.querySelector('m-skeleton-molecule-card .m-summary-card')!.getBoundingClientRect();
          const card = doc.querySelector('m-molecule-summary-card .m-summary-card')!.getBoundingClientRect();
          expect(Math.abs(skeleton.height - card.height)).withContext('loading to content height change').toBeLessThan(1);
          expect(skeleton.width).toBeCloseTo(card.width, 0);
        } finally { fixture.destroy(); frame.remove(); }
      });
      }
    }
  }
});
