import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeCollectionDetailComponent } from './molecule-collection-detail.component';

describe('MoleculeCollectionDetailComponent', () => {
  let component: MoleculeCollectionDetailComponent;
  let fixture: ComponentFixture<MoleculeCollectionDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeCollectionDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeCollectionDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
