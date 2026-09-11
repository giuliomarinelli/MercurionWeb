import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectCoreComponent } from './select-core.component';

describe('SelectCoreComponent', () => {
  let fixture: ComponentFixture<SelectCoreComponent<string, string>>;
  let component: SelectCoreComponent<string, string>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectCoreComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectCoreComponent<string, string>);
    fixture.componentRef.setInput('items', ['Alpha', 'Beta', 'Gamma']);
    fixture.componentRef.setInput('displayFn', (item: string) => item);
    fixture.componentRef.setInput('valueFn', (item: string) => item.toLowerCase());
    fixture.componentRef.setInput('label', 'Example select');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('exposes combobox/listbox semantics and keyboard selection', () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const changes: string[] = [];
    component.selectionChange.subscribe(change => {
      if (change.value !== undefined) changes.push(change.value);
    });

    input.dispatchEvent(new Event('focus'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).not.toBeNull();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(changes).toEqual(['alpha']);
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(input);
  });

  it('shares deterministic filtering and no-results state', () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    input.value = 'missing';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('Nessun risultato');
  });

  it('does not open when disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.dispatchEvent(new Event('focus'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    expect(input.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });
});
