import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeCollectionDetailPageComponent } from './molecule-collection-detail.page.component';

describe('MoleculeCollectionDetailComponent', () => {
  let component: MoleculeCollectionDetailPageComponent;
  let fixture: ComponentFixture<MoleculeCollectionDetailPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeCollectionDetailPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeCollectionDetailPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
