import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkeletonCardLoaderComponent } from './skeleton-card-loader.component';

describe('SkeletonCardLoaderComponent', () => {
  let component: SkeletonCardLoaderComponent;
  let fixture: ComponentFixture<SkeletonCardLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonCardLoaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SkeletonCardLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
