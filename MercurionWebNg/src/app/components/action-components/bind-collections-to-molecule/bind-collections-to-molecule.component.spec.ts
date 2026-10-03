import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NEVER, of } from 'rxjs';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { BindCollectionsToMoleculeContextService } from '../../../services/context/action-context/bind-collections-to-molecule-context.service';

import { BindCollectionsToMoleculeComponent } from './bind-collections-to-molecule.component';

describe('BindCollectionsToMoleculeComponent', () => {
  let component: BindCollectionsToMoleculeComponent;
  let fixture: ComponentFixture<BindCollectionsToMoleculeComponent>;
  let getPage: jasmine.Spy;
  let bind: jasmine.Spy;

  beforeEach(async () => {
    getPage = jasmine.createSpy('getPage').and.returnValue(NEVER);
    bind = jasmine.createSpy('bind').and.returnValue(NEVER);
    await TestBed.configureTestingModule({
      imports: [BindCollectionsToMoleculeComponent],
      providers: [
        { provide: BindCollectionsToMoleculeContextService, useValue: { moleculeId: signal('molecule-1') } },
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
