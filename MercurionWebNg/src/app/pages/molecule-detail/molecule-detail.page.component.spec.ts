import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeDetailPageComponent } from './molecule-detail.page.component';

describe('MoleculeDetailComponent', () => {
  let component: MoleculeDetailPageComponent;
  let fixture: ComponentFixture<MoleculeDetailPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeDetailPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeDetailPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
