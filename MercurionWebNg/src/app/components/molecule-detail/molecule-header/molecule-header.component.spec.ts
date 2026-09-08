import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeHeaderComponent } from './molecule-header.component';

describe('MoleculeHeaderComponent', () => {
  let component: MoleculeHeaderComponent;
  let fixture: ComponentFixture<MoleculeHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeHeaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeHeaderComponent);
    fixture.componentRef.setInput('smiles', 'C');
    fixture.componentRef.setInput('molId', 'molecule-1');
    fixture.componentRef.setInput('isLoggedIn', false);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
