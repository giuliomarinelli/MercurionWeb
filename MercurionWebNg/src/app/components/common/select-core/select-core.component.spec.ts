import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
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
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).not.toBeNull();
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

  it('keeps the shared list and its create form visible when search loses focus', fakeAsync(() => {
    fixture.componentRef.setInput('canCreateNew', true);
    fixture.detectChanges();
    const created: string[] = [];
    component.createNew.subscribe(name => created.push(name));

    const input = fixture.nativeElement.querySelector('[role="combobox"]') as HTMLInputElement;
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).not.toBeNull();

    const createButton = fixture.nativeElement.querySelector('[aria-label="Crea nuovo elemento"]') as HTMLButtonElement;
    createButton.click();
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="listbox"]')).not.toBeNull();
    const newInput = fixture.nativeElement.querySelector('[aria-label="Nome nuovo elemento"]') as HTMLInputElement;
    expect(newInput).not.toBeNull();
    newInput.value = 'Nuova collezione';
    newInput.dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('[aria-label="Conferma creazione"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(created).toEqual(['Nuova collezione']);
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).not.toBeNull();
  }));

  it('keeps the new item name readable in both themes', () => {
    fixture.componentRef.setInput('canCreateNew', true);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="Crea nuovo elemento"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('[aria-label="Nome nuovo elemento"]') as HTMLInputElement;

    const rootWasDark = document.documentElement.classList.contains('dark');
    const bodyWasDark = document.body.classList.contains('dark');
    const reference = document.createElement('span');
    fixture.nativeElement.appendChild(reference);
    try {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      reference.style.backgroundColor = 'var(--color-white)';
      reference.style.color = 'var(--color-slate-900)';
      expect(getComputedStyle(input).backgroundColor).toBe(getComputedStyle(reference).backgroundColor);
      expect(getComputedStyle(input).color).toBe(getComputedStyle(reference).color);

      document.documentElement.classList.add('dark');
      reference.style.backgroundColor = 'var(--color-slate-900)';
      reference.style.color = 'var(--color-slate-50)';
      expect(getComputedStyle(input).backgroundColor).toBe(getComputedStyle(reference).backgroundColor);
      expect(getComputedStyle(input).color).toBe(getComputedStyle(reference).color);
    } finally {
      document.documentElement.classList.toggle('dark', rootWasDark);
      document.body.classList.toggle('dark', bodyWasDark);
      reference.remove();
    }
  });

  it('cancels a draft name and returns focus to create new', fakeAsync(() => {
    fixture.componentRef.setInput('canCreateNew', true);
    fixture.detectChanges();
    const created: string[] = [];
    component.createNew.subscribe(name => created.push(name));

    const createTrigger = fixture.nativeElement.querySelector('[aria-label="Crea nuovo elemento"]') as HTMLButtonElement;
    createTrigger.click();
    fixture.detectChanges();
    tick();

    const nameInput = fixture.nativeElement.querySelector('[aria-label="Nome nuovo elemento"]') as HTMLInputElement;
    nameInput.value = 'Bozza';
    nameInput.dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('[aria-label="Annulla creazione"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    tick();

    expect(created).toEqual([]);
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).not.toBeNull();
    const restoredTrigger = fixture.nativeElement.querySelector('[aria-label="Crea nuovo elemento"]') as HTMLButtonElement;
    expect(document.activeElement).toBe(restoredTrigger);

    restoredTrigger.click();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('[aria-label="Nome nuovo elemento"]') as HTMLInputElement).value).toBe('');
    tick();
  }));

  it('allows the list maximum height to be configured', () => {
    const listbox = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
    expect(listbox.style.maxHeight).toBe('16rem');

    fixture.componentRef.setInput('listMaxHeight', '12rem');
    fixture.detectChanges();
    expect(listbox.style.maxHeight).toBe('12rem');
  });

  it('supports typed multi-selection toggling and chip removal', () => {
    fixture.componentRef.setInput('multiple', true);
    fixture.componentRef.setInput('selectedValues', ['alpha']);
    fixture.detectChanges();

    const changes: string[][] = [];
    component.selectionChange.subscribe(change => changes.push([...change.values]));
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.dispatchEvent(new Event('focus'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(changes).toEqual([[]]);
    expect(fixture.nativeElement.querySelector('[aria-label="Elementi selezionati"]')).not.toBeNull();

    const clearButton = fixture.nativeElement.querySelector('[aria-label="Pulisci selezione"]') as HTMLButtonElement;
    clearButton.click();
    expect(changes).toEqual([[], []]);
  });
});
