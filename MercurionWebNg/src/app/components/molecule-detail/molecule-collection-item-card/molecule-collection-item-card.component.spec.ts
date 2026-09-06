import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeCollectionItemCardComponent } from './molecule-collection-item-card.component';

@Component({
  imports: [MoleculeCollectionItemCardComponent],
  template: '<m-molecule-collection-item-card [molecule]="molecule" [i]="0" />'
})
class MoleculeCollectionItemCardHostComponent {
  readonly molecule = {
    id: 'molecule-from-host',
    type: 'chembl' as const,
    name: 'From host binding',
    syn: '',
    smiles: 'CCO',
    createdAt: 1,
    updatedAt: 2,
    touchedAt: 3,
  };
}

describe('MoleculeCollectionItemCardComponent', () => {
  let component: MoleculeCollectionItemCardComponent;
  let fixture: ComponentFixture<MoleculeCollectionItemCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeCollectionItemCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeCollectionItemCardComponent);
    fixture.componentRef.setInput('molecule', {
      id: 'molecule-1',
      type: 'chembl',
      name: 'Example',
      syn: '',
      smiles: 'CCO',
      createdAt: 1,
      updatedAt: 2,
      touchedAt: 3,
    } as never);
    fixture.componentRef.setInput('i', 0);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the bound molecule identifier in the detail link', () => {
    const link = fixture.nativeElement.querySelector('a[aria-label="Apri molecola Example"]') as HTMLAnchorElement | null;

    expect(link?.getAttribute('href')).toContain('/molecules/detail/molecule-1');
  });

  it('receives complete inputs from a parent template binding', async () => {
    const hostFixture = TestBed.createComponent(MoleculeCollectionItemCardHostComponent);

    hostFixture.detectChanges();
    await hostFixture.whenStable();
    hostFixture.detectChanges();

    const link = hostFixture.nativeElement.querySelector('a[aria-label="Apri molecola From host binding"]') as HTMLAnchorElement | null;
    expect(link?.getAttribute('href')).toContain('/molecules/detail/molecule-from-host');
  });
});
