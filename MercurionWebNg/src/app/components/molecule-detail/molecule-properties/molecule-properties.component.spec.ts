import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculePropertiesComponent } from './molecule-properties.component';

describe('MoleculePropertiesComponent', () => {
  let component: MoleculePropertiesComponent;
  let fixture: ComponentFixture<MoleculePropertiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculePropertiesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculePropertiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
