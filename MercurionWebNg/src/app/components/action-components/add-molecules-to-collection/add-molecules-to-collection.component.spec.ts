import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NEVER, Subject, of } from 'rxjs';
import { Router } from '@angular/router';
import { AddMoleculesToCollectionContextService } from '../../../services/context/action-context/add-molecules-to-collection-context.service';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { MoleculeCollectionItemService } from '../../../services/graphql/molecule-collection-item.service';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { MoleculeSearchService } from '../../../services/graphql/molecule-search.service';
import { DomainInvalidationService } from '../../../services/domain-invalidation.service';
import { ToastService } from '../../../services/toast.service';
import { AddMoleculesToCollectionComponent } from './add-molecules-to-collection.component';

describe('AddMoleculesToCollectionComponent', () => {
  let component: AddMoleculesToCollectionComponent;
  let fixture: ComponentFixture<AddMoleculesToCollectionComponent>;
  let request: Subject<boolean>;
  let existing: jasmine.Spy;
  let chembl: jasmine.Spy;
  const overlay = { session: () => ({ id: 42 }), close: jasmine.createSpy('close'), beginSubmit: jasmine.createSpy('beginSubmit'), submitSucceeded: jasmine.createSpy('submitSucceeded'), submitFailed: jasmine.createSpy('submitFailed') };
  const invalidation = { publish: jasmine.createSpy('publish') };
  const router = { navigateByUrl: jasmine.createSpy('navigateByUrl') };
  beforeEach(async () => {
    request = new Subject<boolean>();
    existing = jasmine.createSpy('existing').and.returnValue(request);
    chembl = jasmine.createSpy('chembl').and.returnValue(request);
    overlay.close.calls.reset(); invalidation.publish.calls.reset(); router.navigateByUrl.calls.reset();
    await TestBed.configureTestingModule({ imports: [AddMoleculesToCollectionComponent], providers: [
      { provide: AddMoleculesToCollectionContextService, useValue: { collectionId: signal('collection-1'), importFromChembl: signal(false), redirectToCollectionPath: signal(true) } },
      { provide: ActionOverlayContextService, useValue: overlay },
      { provide: MoleculeCollectionService, useValue: { getCollectionById: () => of({ id: 'collection-1', name: 'Test' }) } },
      { provide: MoleculeCollectionItemService, useValue: { getAllPaginatedItems: () => NEVER, addManyMoleculesToCollection: existing, addManyChEMBLItemsToCollection: chembl, searchChemblMolecules_excludeAlreadyAdded: () => NEVER } },
      { provide: MoleculeSearchService, useValue: {} },
      { provide: DomainInvalidationService, useValue: invalidation },
      { provide: ToastService, useValue: { trigger: jasmine.createSpy('toast') } },
      { provide: Router, useValue: router }
    ] }).compileComponents();
    fixture = TestBed.createComponent(AddMoleculesToCollectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('preserves each source selection when switching and submits only the active source', fakeAsync(() => {
    flushMicrotasks();
    component.onSelectAllChange(true);
    component.methodControl.setValue('chembl'); fixture.detectChanges(); flushMicrotasks();
    component.addChip({ id: '17', name: 'Benzene' });
    component.methodControl.setValue('my'); fixture.detectChanges(); flushMicrotasks();
    expect(component.isSelectedAll()).toBeTrue();
    expect(component.selectedIds).toEqual(['17']);
    component.clearSelections();
    expect(component.selectedIds).toEqual(['17']);
    component.methodControl.setValue('chembl'); fixture.detectChanges(); flushMicrotasks();
    component.dispatchSubmit();
    expect(existing).not.toHaveBeenCalled();
    expect(chembl).toHaveBeenCalledOnceWith('collection-1', [{ chemblMolregno: 17, name: 'Benzene' }]);
  }));
  it('locks both source and selections and rejects repeated ChEMBL submission', fakeAsync(() => {
    flushMicrotasks();
    component.methodControl.setValue('chembl'); fixture.detectChanges(); flushMicrotasks();
    component.addChip({ id: '17', name: 'Benzene' });
    component.dispatchSubmit(); component.dispatchSubmit(); component.removeChip('17'); component.addChip({ id: '18', name: 'Other' }); component.close();
    fixture.detectChanges();
    expect(chembl.calls.count()).toBe(1);
    expect(component.selectedIds).toEqual(['17']);
    expect(component.methodControl.disabled).toBeTrue();
    expect(overlay.close).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('section.m-action-card').getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelector('[aria-label="Aggiungi molecole selezionate"]').disabled).toBeTrue();
  }));
  for (const transportError of [false, true]) {
    it('preserves global selection after ' + (transportError ? 'transport failure' : 'negative result') + ' and allows retry', fakeAsync(() => {
      flushMicrotasks(); component.onSelectAllChange(true); component.dispatchSubmit();
      if (transportError) request.error(new Error('network')); else request.next(false);
      fixture.detectChanges();
      expect(component.isSelectedAll()).toBeTrue();
      expect(component.methodControl.enabled).toBeTrue();
      expect(overlay.close).not.toHaveBeenCalled(); expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Le selezioni sono conservate');
      existing.and.returnValue(new Subject<boolean>()); component.dispatchSubmit();
      expect(existing.calls.count()).toBe(2); expect(component.error()).toBeFalse();
    }));
  }
  it('confirms once, invalidates the destination and redirects only after success', fakeAsync(() => {
    flushMicrotasks(); component.onSelectAllChange(true); component.dispatchSubmit(); request.next(true); request.next(true); flushMicrotasks();
    expect(invalidation.publish).toHaveBeenCalledOnceWith({ domain: 'molecule-collection', action: 'molecules-added', collectionId: 'collection-1' });
    expect(overlay.close).toHaveBeenCalledOnceWith(42);
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/molecules/collections/detail/collection-1');
  }));
  it('does not submit an empty selection', fakeAsync(() => { flushMicrotasks(); component.dispatchSubmit(); expect(existing).not.toHaveBeenCalled(); expect(chembl).not.toHaveBeenCalled(); }));
  it('issues one request when the search field emits both clear events', fakeAsync(() => {
    flushMicrotasks();
    const fetch = spyOn(TestBed.inject(MoleculeCollectionItemService), 'getAllPaginatedItems').and.returnValue(NEVER);
    component.doQuery('aspirin'); component.doQuery(''); component.doClear();
    expect(fetch.calls.count()).toBe(2);
    expect(component.searchTerm()).toBe('');
  }));
});
