import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionSelectCardComponent } from './collection-select-card.component';

describe('CollectionSelectCardComponent', () => {
  let component: CollectionSelectCardComponent;
  let fixture: ComponentFixture<CollectionSelectCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionSelectCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollectionSelectCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isSelectAll', true)
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
