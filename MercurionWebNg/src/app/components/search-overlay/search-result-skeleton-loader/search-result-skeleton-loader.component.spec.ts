import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchResultSkeletonLoaderComponent } from './search-result-skeleton-loader.component';

describe('SearchResultSkeletonLoaderComponent', () => {
  let component: SearchResultSkeletonLoaderComponent;
  let fixture: ComponentFixture<SearchResultSkeletonLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchResultSkeletonLoaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchResultSkeletonLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
