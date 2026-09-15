import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoleculeSummaryCardComponent } from './molecule-summary-card.component';
import { MoleculeSummaryViewModel } from './molecule-summary-card.view-model';

describe('MoleculeSummaryCardComponent', () => {
  let fixture: ComponentFixture<MoleculeSummaryCardComponent>;

  const model = (source: MoleculeSummaryViewModel['source'], overrides: Partial<MoleculeSummaryViewModel> = {}): MoleculeSummaryViewModel => ({
    source,
    id: 'molecule-1',
    name: 'Example',
    synonym: 'Example synonym',
    smiles: 'CCO',
    actions: [],
    selectable: false,
    compact: source !== 'saved',
    ...overrides
  } as MoleculeSummaryViewModel);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MoleculeSummaryCardComponent] }).compileComponents();
    fixture = TestBed.createComponent(MoleculeSummaryCardComponent);
  });

  it('renders saved metadata and configured actions from the saved discriminant', () => {
    fixture.componentRef.setInput('viewModel', model('saved', {
      badge: 'ChEMBL',
      molecularWeight: 123.4,
      phase: 3,
      actions: [{ kind: 'button', label: 'Elimina', action: 'delete' }]
    }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('ChEMBL');
    expect(fixture.nativeElement.textContent).toContain('MW:');
    expect(fixture.nativeElement.textContent).toContain('Phase 3');
    expect(fixture.nativeElement.querySelector('button[aria-label="Elimina"]')).not.toBeNull();
  });

  it('renders compact search and external variants through the same template', () => {
    fixture.componentRef.setInput('viewModel', model('search', { compact: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('article')).not.toBeNull();

    fixture.componentRef.setInput('viewModel', model('external', { compact: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('article')).not.toBeNull();
  });

  it('emits semantic action events without changing the view model', () => {
    const action = jasmine.createSpy('action');
    fixture.componentRef.setInput('viewModel', model('saved', {
      actions: [{ kind: 'button', label: 'Seleziona', action: 'select' }],
      selectable: true
    }));
    fixture.componentInstance.actionSelected.subscribe(action);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(action).toHaveBeenCalledWith('select');
  });
});
