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

  it('selects a ChEMBL result through the full card instead of a separate action', () => {
    fixture.componentRef.setInput('search_excludeAlreadyAdded', true);
    const select = jasmine.createSpy('select');
    component.onChipItem.subscribe(select);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.classList).toContain('inset-0');
    expect(button.getAttribute('aria-label')).toContain('Seleziona molecola');
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Clicca per selezionare');
    button.click();
    expect(select).toHaveBeenCalledOnceWith({ id: 'molecule-1', name: 'Lead molecule-1' });
  });
});
