import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { CustomMoleculeCollectionItemSaveComponent } from './custom-molecule-collection-item-save.component';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { CustomMoleculeCollectionItemSaveContextService } from '../../../services/context/action-context/custom-molecule-collection-item-save-context.service';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { MoleculeJoinService } from '../../../services/graphql/molecule-collection-join.service';
import { ChemistryRendererService } from '../../../chemistry/chemistry-renderer.service';
import { MoleculeEditorDraftService } from '../../../chemistry/molecule-editor-draft.service';
import { ToastService } from '../../../services/toast.service';
import { DomainInvalidationService } from '../../../services/domain-invalidation.service';
import { MoleculeProperties } from '../../../Models/graphql/molecule-properties.model';
import { ApplicationClientError, ApplicationErrorCode } from '../../../utils/application-error.util';

const properties: MoleculeProperties = { mwFreebase: 74.123, alogp: 1.0428, hba: 1, hbd: 0, psa: 9.23, rtb: 2 };
describe('CustomMoleculeCollectionItemSaveComponent', () => {
  let component: CustomMoleculeCollectionItemSaveComponent;
  let fixture: ComponentFixture<CustomMoleculeCollectionItemSaveComponent>;
  let request: Subject<unknown>;
  let creation: Subject<unknown>;
  let join: jasmine.Spy;
  let create: jasmine.Spy;
  let fetch: jasmine.Spy;
  let renderer: jasmine.Spy;
  const overlay = jasmine.createSpyObj('overlay', ['session', 'close', 'beginSubmit', 'submitSucceeded', 'submitFailed']);
  const drafts = { clearCurrent: jasmine.createSpy('clearCurrent') };
  const router = { navigate: jasmine.createSpy('navigate').and.resolveTo(true) };
  const toast = { trigger: jasmine.createSpy('trigger') };
  const invalidations = { publish: jasmine.createSpy('publish') };
  const context = { selectedCollectionId: signal<string | null>(null), searchTerm: signal(''), smiles: signal('CCOCC'), mode: signal('create') };
  beforeEach(async () => {
    request = new Subject(); creation = new Subject();
    join = jasmine.createSpy('addCustomMoleculeToCollection').and.returnValue(request);
    create = jasmine.createSpy('createCollection').and.returnValue(creation);
    fetch = jasmine.createSpy('getPaginatedCollections').and.returnValue(of({ items: [], currentPage: 1, totalPages: 1 }));
    renderer = jasmine.createSpy('getMoleculeProperties').and.resolveTo(properties);
    overlay.close.calls.reset(); overlay.beginSubmit.calls.reset(); overlay.submitSucceeded.calls.reset(); overlay.submitFailed.calls.reset();
    overlay.session.and.returnValue({ id: 42 });
    drafts.clearCurrent.calls.reset(); router.navigate.calls.reset(); toast.trigger.calls.reset(); invalidations.publish.calls.reset();
    context.selectedCollectionId.set(null); context.searchTerm.set(''); context.smiles.set('CCOCC'); context.mode.set('create');
    await TestBed.configureTestingModule({ imports: [CustomMoleculeCollectionItemSaveComponent], providers: [
      { provide: ActionOverlayContextService, useValue: overlay },
      { provide: CustomMoleculeCollectionItemSaveContextService, useValue: context },
      { provide: MoleculeCollectionService, useValue: { createCollection: create, getPaginatedCollections: fetch } },
      { provide: MoleculeJoinService, useValue: { addCustomMoleculeToCollection: join } },
      { provide: ChemistryRendererService, useValue: { getMoleculeProperties: renderer } },
      { provide: MoleculeEditorDraftService, useValue: drafts }, { provide: Router, useValue: router },
      { provide: ToastService, useValue: toast }, { provide: DomainInvalidationService, useValue: invalidations }
    ] }).compileComponents();
    fixture = TestBed.createComponent(CustomMoleculeCollectionItemSaveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
  });
  function fill(): void {
    component.onSelect({ id: 'c-1', name: 'Riferimenti' });
    component.nameModel = ' Etere '; component.labelModel = ' Test '; component.notesModel = ' Note di prova ';
  }
  it('rejects whitespace names and missing structures before mutation', () => {
    fill(); component.nameModel = '   '; component.onConfirm(); expect(join).not.toHaveBeenCalled();
    component.nameModel = 'Etere'; context.smiles.set(''); component.onConfirm(); expect(join).not.toHaveBeenCalled();
  });
  it('retains the destination and draft when search has no results', () => {
    fill(); component.onSearchChange('inesistente');
    expect(component.collections()).toEqual([]); expect(component.selectedCollectionName()).toBe('Riferimenti');
    expect(context.selectedCollectionId()).toBe('c-1'); expect(component.nameModel).toBe(' Etere ');
  });
  it('returns focus to the destination disclosure after collapsing the picker', async () => {
    fill(); await fixture.whenStable(); fixture.detectChanges();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.save-destination summary'));
  });
  it('locks dismissal, selection and repeated submission while saving', () => {
    fill(); component.onConfirm(); component.onConfirm(); component.close(); component.onSelect({ id: 'c-2', name: 'Altra' });
    fixture.detectChanges();
    expect(join).toHaveBeenCalledTimes(1); expect(context.selectedCollectionId()).toBe('c-1'); expect(overlay.close).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('section.m-action-card').getAttribute('aria-busy')).toBe('true');
  });
  it('preserves all fields and the editor draft after failure and allows retry', () => {
    fill(); component.onConfirm(); request.error(new Error('network')); fixture.detectChanges();
    expect(component.nameModel).toBe(' Etere '); expect(component.labelModel).toBe(' Test '); expect(component.notesModel).toBe(' Note di prova ');
    expect(component.properties()).toEqual(properties); expect(component.canSave()).toBeTrue();
    expect(drafts.clearCurrent).not.toHaveBeenCalled(); expect(router.navigate).not.toHaveBeenCalled(); expect(overlay.close).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('I dati inseriti sono ancora qui');
    join.and.returnValue(new Subject()); component.onConfirm(); expect(join).toHaveBeenCalledTimes(2); expect(component.saveError()).toBe('');
  });
  it('saves a normalized snapshot and navigates to its original destination only after success', () => {
    fill(); component.onConfirm(); context.selectedCollectionId.set('c-2');
    expect(join).toHaveBeenCalledOnceWith({ collectionId: 'c-1', input: { canonicalSmiles: 'CCOCC', name: 'Etere', label: 'Test', notes: 'Note di prova', propertiesJson: JSON.stringify(properties) } });
    expect(drafts.clearCurrent).not.toHaveBeenCalled(); request.next({ id: 'm-1' });
    expect(drafts.clearCurrent).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/molecules/detail/m-1'], { queryParams: { c_id: 'c-1' } });
    expect(toast.trigger).toHaveBeenCalledWith('Molecola salvata in “Riferimenti”.', 'success'); expect(overlay.close).toHaveBeenCalledWith(42);
  });
  it('ignores late save results after the overlay is destroyed', () => {
    fill(); component.onConfirm(); fixture.destroy(); request.next({ id: 'm-1' });
    expect(drafts.clearCurrent).not.toHaveBeenCalled(); expect(router.navigate).not.toHaveBeenCalled(); expect(overlay.close).not.toHaveBeenCalled();
  });
  it('explains a structure conflict without suggesting an ineffective retry', () => {
    fill(); component.onConfirm(); request.error(new ApplicationClientError(ApplicationErrorCode.MOLECULE_SMILES_CONFLICT));
    expect(component.saveError()).toContain('già presente');
    expect(component.nameModel).toBe(' Etere '); expect(drafts.clearCurrent).not.toHaveBeenCalled();
  });
  it('keeps the pending collection name and existing draft on creation error', () => {
    fill(); component.onCreateNew('  Nuova   collezione  '); component.onCreateNew('Altra'); component.close();
    expect(create).toHaveBeenCalledOnceWith('Nuova collezione'); expect(overlay.close).not.toHaveBeenCalled();
    creation.error(new Error('network')); expect(component.failedCreationName()).toBe('Nuova collezione');
    expect(component.nameModel).toBe(' Etere '); expect(context.selectedCollectionId()).toBe('c-1');
    create.and.returnValue(of({ id: 'new', name: 'Nuova collezione' })); component.onCreateNew(component.failedCreationName());
    expect(context.selectedCollectionId()).toBe('new'); expect(component.selectedCollectionName()).toBe('Nuova collezione'); expect(component.canSave()).toBeTrue();
  });
  it('rejects invalid collection names without sending a request', () => {
    component.onCreateNew(' '); component.onCreateNew('x'.repeat(256)); expect(create).not.toHaveBeenCalled(); expect(component.creationError()).toBeTruthy();
  });
  it('exposes collection load errors with a recovery action', () => {
    fetch.and.returnValue(throwError(() => new Error('network'))); component.onSearchChange('test'); fixture.detectChanges();
    expect(component.loadError()).toBeTrue(); expect(fixture.nativeElement.textContent).toContain('Riprova caricamento');
    fetch.and.returnValue(of({ items: [], currentPage: 1, totalPages: 1 })); component.loadCollections(true); expect(component.loadError()).toBeFalse();
  });
  it('guards concurrent property computations and permits saving after a calculation failure', async () => {
    fill(); let reject!: (error: Error) => void;
    renderer.and.returnValue(new Promise((_, rejectPromise) => { reject = rejectPromise; }));
    component.computeProps(); component.computeProps(); component.onConfirm();
    expect(renderer).toHaveBeenCalledTimes(2); expect(join).not.toHaveBeenCalled(); expect(component.canSave()).toBeFalse();
    reject(new Error('RDKit')); await fixture.whenStable(); fixture.detectChanges();
    expect(component.propertiesError()).toBeTrue(); expect(component.canSave()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('salvare senza questi valori');
  });
  it('ignores late property computation after destroy', async () => {
    let resolve!: (value: MoleculeProperties) => void;
    renderer.and.returnValue(new Promise(resolvePromise => { resolve = resolvePromise; }));
    component.computeProps(); fixture.destroy(); resolve({ ...properties, hba: 9 }); await Promise.resolve();
    expect(component.properties()).toEqual(properties);
  });
  it('states creation semantics even when opened from edit mode', () => {
    context.mode.set('edit'); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('senza modificare quella di origine');
    fill(); component.onConfirm(); expect(join).toHaveBeenCalledTimes(1);
  });
  it('submits through native form semantics and resolves field descriptions', () => {
    fill(); fixture.detectChanges();
    const submit: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submit.form).toBe(fixture.nativeElement.querySelector('form'));
    fixture.nativeElement.querySelectorAll('input[aria-describedby]').forEach((input: HTMLInputElement) => {
      input.getAttribute('aria-describedby')!.split(' ').forEach(id => expect(fixture.nativeElement.querySelector('#' + id)).not.toBeNull());
    });
    submit.click(); expect(join).toHaveBeenCalledTimes(1);
  });
});
