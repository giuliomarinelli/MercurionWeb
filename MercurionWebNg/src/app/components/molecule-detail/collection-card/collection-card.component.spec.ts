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
});
