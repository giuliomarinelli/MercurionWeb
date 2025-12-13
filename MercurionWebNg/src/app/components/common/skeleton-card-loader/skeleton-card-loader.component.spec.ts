import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkeletonCollectionCardComponent } from './skeleton-card-loader.component';

describe('SkeletonCollectionCardComponent', () => {
  let component: SkeletonCollectionCardComponent;
  let fixture: ComponentFixture<SkeletonCollectionCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonCollectionCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SkeletonCollectionCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
