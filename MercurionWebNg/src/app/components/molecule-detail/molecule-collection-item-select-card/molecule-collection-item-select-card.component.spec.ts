import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeCollectionItemSelectCardComponent } from './molecule-collection-item-select-card.component';

describe('MoleculeCollectionItemSelectCardComponent', () => {
  let component: MoleculeCollectionItemSelectCardComponent;
  let fixture: ComponentFixture<MoleculeCollectionItemSelectCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeCollectionItemSelectCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeCollectionItemSelectCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
