import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeCollectionItemCardComponent } from './molecule-collection-item-card.component';

describe('MoleculeCollectionItemCardComponent', () => {
  let component: MoleculeCollectionItemCardComponent;
  let fixture: ComponentFixture<MoleculeCollectionItemCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeCollectionItemCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeCollectionItemCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
