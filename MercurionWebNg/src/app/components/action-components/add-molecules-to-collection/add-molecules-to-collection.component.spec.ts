import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMoleculesToCollectionComponent } from './add-molecules-to-collection.component';

describe('AddMoleculesToCollectionComponent', () => {
  let component: AddMoleculesToCollectionComponent;
  let fixture: ComponentFixture<AddMoleculesToCollectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMoleculesToCollectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddMoleculesToCollectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
