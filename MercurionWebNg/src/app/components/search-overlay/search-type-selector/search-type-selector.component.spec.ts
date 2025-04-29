import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchTypeSelectorComponent } from './search-type-selector.component';

describe('SearchTypeSelectorComponent', () => {
  let component: SearchTypeSelectorComponent;
  let fixture: ComponentFixture<SearchTypeSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchTypeSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchTypeSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
