import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchResultComponent } from './search-result.component';

describe('SearchResultComponent', () => {
  let component: SearchResultComponent;
  let fixture: ComponentFixture<SearchResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchResultComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchResultComponent);
    fixture.componentRef.setInput('molecule', { id: 'molecule-1' } as never);
    fixture.componentRef.setInput('query', 'test');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
