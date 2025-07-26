import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionSaveOverlayComponent } from './collection-save-overlay.component';

describe('CollectionSaveOverlayComponent', () => {
  let component: CollectionSaveOverlayComponent;
  let fixture: ComponentFixture<CollectionSaveOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionSaveOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollectionSaveOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
