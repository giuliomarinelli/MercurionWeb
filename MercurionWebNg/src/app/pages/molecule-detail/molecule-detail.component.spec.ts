import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeDetailComponent } from './molecule-detail.component';

describe('MoleculeDetailComponent', () => {
  let component: MoleculeDetailComponent;
  let fixture: ComponentFixture<MoleculeDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
