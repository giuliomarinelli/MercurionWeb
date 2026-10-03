import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionCardComponent } from './collection-card.component';

describe('CollectionCardComponent', () => {
  let component: CollectionCardComponent;
  let fixture: ComponentFixture<CollectionCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollectionCardComponent);
    fixture.componentRef.setInput('collection', {
      id: 'collection-1',
      name: 'Test collection',
      itemsCount: 2,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z'
    });
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the same presentation in selectable mode and emits selection changes', () => {
    fixture.componentRef.setInput('selectable', true);
    fixture.detectChanges();

    const control = fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(control).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Test collection');

    control.click();

    expect(component.selected()).toBeTrue();
  });

  it('keeps navigation and selection semantics separate', () => {
    fixture.componentRef.setInput('selectable', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    expect(fixture.nativeElement.querySelector('article')?.getAttribute('role')).toBeNull();
  });

  it('selects from the full card label without repeating its name in a visible checkbox label', () => {
    fixture.componentRef.setInput('selectable', true);
    fixture.componentRef.setInput('isReadonly', true);
    fixture.detectChanges();
    const control = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const label = control.closest('label')!;
    expect(label.classList).toContain('m-selection-control--card');
    expect(label.querySelector('.m-selection-control__content')?.classList).toContain('sr-only');
    label.click();
    fixture.detectChanges();
    expect(component.selected()).toBeTrue();
    control.click();
    expect(component.selected()).toBeFalse();
  });

  it('does not select a disabled card', () => {
    fixture.componentRef.setInput('selectable', true);
    fixture.componentRef.setInput('selectionDisabled', true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('label').click();
    expect(component.selected()).toBeFalse();
  });
});
