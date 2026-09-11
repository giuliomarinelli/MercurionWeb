import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComboMultiSelectComponent } from './combo-multi-select.component';

describe('ComboMultiSelectComponent', () => {
  let component: ComboMultiSelectComponent<string, string>;
  let fixture: ComponentFixture<ComboMultiSelectComponent<string, string>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComboMultiSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComboMultiSelectComponent<string, string>);
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('displayFn', (item: string) => item);
    fixture.componentRef.setInput('valueFn', (item: string) => item);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits typed values from shared keyboard selection', () => {
    fixture.componentRef.setInput('items', ['Alpha', 'Beta']);
    const values: string[][] = [];
    component.selectionChange.subscribe(selection => values.push(selection));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(values).toEqual([['Alpha']]);
  });
});
