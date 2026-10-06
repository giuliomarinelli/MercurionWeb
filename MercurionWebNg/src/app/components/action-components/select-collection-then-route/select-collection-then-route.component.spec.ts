import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { SelectCollectionThenRouteComponent } from './select-collection-then-route.component';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';

describe('SelectCollectionThenRouteComponent', () => {
  let component: SelectCollectionThenRouteComponent;
  let fixture: ComponentFixture<SelectCollectionThenRouteComponent>;
  let getPage: jasmine.Spy;
  let create: jasmine.Spy;
  const collection = { id: 'col-1', name: 'Riferimenti', itemsCount: 0, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
  const overlay = { session: () => ({ id: 42, input: { importFromChembl: true } }), close: jasmine.createSpy('close'), switchToScope: jasmine.createSpy('switch'), beginSubmit: jasmine.createSpy('beginSubmit'), submitSucceeded: jasmine.createSpy('submitSucceeded'), submitFailed: jasmine.createSpy('submitFailed') };
  beforeEach(async () => {
    overlay.close.calls.reset();
    overlay.switchToScope.calls.reset();
    getPage = jasmine.createSpy('getPage').and.returnValue(of({ items: [collection], currentPage: 1, totalPages: 1 }));
    create = jasmine.createSpy('create').and.returnValue(of(collection));
    await TestBed.configureTestingModule({ imports: [SelectCollectionThenRouteComponent], providers: [
      { provide: ActionOverlayContextService, useValue: overlay },
      { provide: MoleculeCollectionService, useValue: { getPaginatedCollections: getPage, createCollection: create } }
    ] }).compileComponents();
    fixture = TestBed.createComponent(SelectCollectionThenRouteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('does not continue without a destination', fakeAsync(() => {
    flushMicrotasks();
    component.routeAction();
    flushMicrotasks();
    expect(overlay.switchToScope).not.toHaveBeenCalled();
  }));
  it('keeps the selected destination visible across searches and switches once with the correct input', fakeAsync(() => {
    flushMicrotasks();
    component.onSelect(collection);
    getPage.and.returnValue(of({ items: [], currentPage: 1, totalPages: 1 }));
    component.onSearchChange('Other');
    expect(component.selectedCollectionName()).toBe('Riferimenti');
    component.routeAction();
    component.routeAction();
    flushMicrotasks();
    expect(overlay.switchToScope).toHaveBeenCalledOnceWith('AddMoleculesToCollection', { collectionId: 'col-1', importFromChembl: true, redirectToCollectionPath: true });
  }));
  it('locks inline creation, preserves the failed name and supports retry', fakeAsync(() => {
    flushMicrotasks();
    const request = new Subject<MoleculeCollection>();
    create.and.returnValue(request);
    component.onCreateNew('  Nuova   collezione  ');
    component.onCreateNew('Duplicata');
    component.close();
    expect(create).toHaveBeenCalledOnceWith('Nuova collezione');
    expect(overlay.close).not.toHaveBeenCalled();
    request.error(new Error('network'));
    expect(component.loading()).toBeFalse();
    expect(component.failedCreationName()).toBe('Nuova collezione');
    create.and.returnValue(of(collection));
    component.onCreateNew(component.failedCreationName());
    expect(component.creationError()).toBe('');
    expect(component.selectedCollectionName()).toBe('Riferimenti');
  }));
  it('exposes a discovery failure and reloads without discarding the destination', fakeAsync(() => {
    flushMicrotasks();
    component.onSelect(collection);
    getPage.and.returnValue(throwError(() => new Error('network')));
    component.onSearchChange('Other');
    expect(component.loadError()).toBeTrue();
    getPage.and.returnValue(of({ items: [collection], currentPage: 1, totalPages: 1 }));
    component.loadCollections(true);
    expect(component.loadError()).toBeFalse();
    expect(component.selectedCollectionId()).toBe('col-1');
  }));
});
