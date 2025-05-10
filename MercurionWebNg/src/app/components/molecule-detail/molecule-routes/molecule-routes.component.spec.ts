import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeRoutesComponent } from './molecule-routes.component';

describe('MoleculeRoutesComponent', () => {
  let component: MoleculeRoutesComponent;
  let fixture: ComponentFixture<MoleculeRoutesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeRoutesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeRoutesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
