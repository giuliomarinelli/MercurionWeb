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
  it('reflects the selected source supplied by the parent, including a reset', () => {
    fixture.componentRef.setInput('value', 'my');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[value="my"]').checked).toBeTrue();
    fixture.componentRef.setInput('value', 'chembl');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[value="chembl"]').checked).toBeTrue();
    expect(fixture.nativeElement.querySelector('input[value="my"]').checked).toBeFalse();
  });

});
