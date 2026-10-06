import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NEVER, of, Subject } from 'rxjs';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { BindCollectionsToMoleculeContextService } from '../../../services/context/action-context/bind-collections-to-molecule-context.service';

import { BindCollectionsToMoleculeComponent } from './bind-collections-to-molecule.component';

describe('BindCollectionsToMoleculeComponent', () => {
  let component: BindCollectionsToMoleculeComponent;
  let fixture: ComponentFixture<BindCollectionsToMoleculeComponent>;
  let getPage: jasmine.Spy;
  let bind: jasmine.Spy;
  const overlay = { session: () => ({ id: 42 }), close: jasmine.createSpy('close'), beginSubmit: jasmine.createSpy('beginSubmit'), submitSucceeded: jasmine.createSpy('submitSucceeded'), submitFailed: jasmine.createSpy('submitFailed') };

  beforeEach(async () => {
    overlay.close.calls.reset();
    getPage = jasmine.createSpy('getPage').and.returnValue(NEVER);
    bind = jasmine.createSpy('bind').and.returnValue(NEVER);
    await TestBed.configureTestingModule({
      imports: [BindCollectionsToMoleculeComponent],
      providers: [
        { provide: ActionOverlayContextService, useValue: overlay },
        { provide: BindCollectionsToMoleculeContextService, useValue: {
          moleculeId: signal('molecule-1'), moleculeName: signal('Molecola')
        } },
        { provide: MoleculeCollectionService, useValue: {
          getPaginatedCollections: getPage, bindManyCollectionsToMolecule: bind
        } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BindCollectionsToMoleculeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('locks pending selection and retains it after a rejected mutation', () => {
    const request = new Subject<{ ok: boolean; moleculeUUID: string | null }>();
    bind.and.returnValue(request);
    component.selectedIdSet.set(new Set(['col-1']));
    component.doSubmit();
    component.doSubmit();
    component.onSelectAllChange(false);
    component.close();
    expect(bind.calls.count()).toBe(1);
    expect(component.selectedIdSet().has('col-1')).toBeTrue();
    expect(overlay.close).not.toHaveBeenCalled();
    request.next({ ok: false, moleculeUUID: null });
    expect(component.error()).toBeTrue();
    expect(component.pending()).toBeFalse();
    component.doSubmit();
    expect(bind.calls.count()).toBe(2);
  });

  it('keeps selections and offers retry after a transport failure', () => {
    const request = new Subject();
    bind.and.returnValue(request);
    component.selectedIdSet.set(new Set(['col-1']));
    component.doSubmit();
    request.error(new Error('network'));
    fixture.detectChanges();
    expect(component.selectionSummary()).toBe('1 collezione selezionata.');
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('selezioni sono conservate');
    expect(overlay.close).not.toHaveBeenCalled();
  });

  it('keeps global selection and exclusions across pagination and search, including the submit command', fakeAsync(() => {
    flushMicrotasks();
    const collection = (id: string) => ({
      id, name: id, itemsCount: 0,
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
    });
    getPage.and.callFake((page: number, _limit: number, query: string) => of({
      items: [collection(query ? 'only-search-result' : `page-${page}`)],
      currentPage: page, totalPages: 2
    }));
    component.onSelectAllChange(true);
    component.resetPagination();
    tick(101);
    fixture.detectChanges();
    flushMicrotasks();
    expect(component.multiselectItems()[0].isChecked()).toBeTrue();

    void component.loadMore();
    tick(101);
    fixture.detectChanges();
    flushMicrotasks();
    expect(component.multiselectItems().map(row => row.isChecked())).toEqual([true, true]);

    const excluded = component.multiselectItems()[0];
    excluded.isChecked.set(false);
    component.toggleOne(excluded);
    component.doQuery('search');
    tick(101);
    fixture.detectChanges();
    flushMicrotasks();
    expect(component.multiselectItems()[0].item.id).toBe('only-search-result');
    expect(component.multiselectItems()[0].isChecked()).toBeTrue();
    expect(component.isSelectedAll()).toBeFalse();
    expect(component.isPartiallySelected()).toBeTrue();
    fixture.detectChanges();

    const allControl = fixture.nativeElement.querySelector('input[aria-label="Seleziona tutte le collezioni"]') as HTMLInputElement;
    expect(allControl).toBeTruthy();
    expect(allControl.indeterminate).toBeTrue();
    component.doSubmit();
    expect(bind).toHaveBeenCalledWith('molecule-1', ['page-1'], true, jasmine.any(String));
  }));
});
