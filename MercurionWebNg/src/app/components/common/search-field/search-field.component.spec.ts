import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchFieldComponent } from './search-field.component';

describe('SearchFieldComponent', () => {
  let fixture: ComponentFixture<SearchFieldComponent>;
  let component: SearchFieldComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchFieldComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchFieldComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', 'caffeine');
    fixture.detectChanges();
  });

  it('emits user input immediately without owning debounce policy', () => {
    const values: string[] = [];
    component.valueChange.subscribe(value => values.push(value));

    component.onInput('caffeine a');

    expect(values).toEqual(['caffeine a']);
  });

  it('emits the empty value deterministically when cleared', () => {
    const values: string[] = [];
    const cleared: string[] = [];
    component.valueChange.subscribe(value => values.push(value));
    component.cleared.subscribe(value => cleared.push(value));

    component.clear();

    expect(values).toEqual(['']);
    expect(cleared).toEqual(['']);
  });

  it('exposes an accessible name and pending status', () => {
    fixture.componentRef.setInput('label', 'Cerca molecola');
    fixture.componentRef.setInput('hint', 'Digita almeno due caratteri');
    fixture.componentRef.setInput('pending', true);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input');
    expect(input.getAttribute('aria-label')).toBe('Cerca molecola');
    expect(input.getAttribute('aria-describedby')).toContain('-hint');
    expect(input.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();
  });

  it('does not emit while disabled', () => {
    const values: string[] = [];
    component.valueChange.subscribe(value => values.push(value));
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    component.onInput('ignored');
    component.clear();

    expect(values).toEqual([]);
  });
});
