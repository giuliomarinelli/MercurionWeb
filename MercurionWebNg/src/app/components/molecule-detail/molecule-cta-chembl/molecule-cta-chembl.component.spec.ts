import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeCtaChemblComponent } from './molecule-cta-chembl.component';

describe('MoleculeCtaChemblComponent', () => {
  let component: MoleculeCtaChemblComponent;
  let fixture: ComponentFixture<MoleculeCtaChemblComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeCtaChemblComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeCtaChemblComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
