import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomMoleculeCollectionItemSaveComponent } from './custom-molecule-collection-item-save.component';

describe('CustomMoleculeCollectionItemSaveComponent', () => {
  let component: CustomMoleculeCollectionItemSaveComponent;
  let fixture: ComponentFixture<CustomMoleculeCollectionItemSaveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomMoleculeCollectionItemSaveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomMoleculeCollectionItemSaveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
