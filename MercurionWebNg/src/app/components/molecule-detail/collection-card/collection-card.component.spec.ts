import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionCardComponent } from './collection-card.component';

describe('CollectionCardComponent', () => {
  let component: CollectionCardComponent;
  let fixture: ComponentFixture<CollectionCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollectionCardComponent);
    fixture.componentRef.setInput('collection', { id: 'collection-1' } as never);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
