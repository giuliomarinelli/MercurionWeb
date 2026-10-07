import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { RouterLink, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { AllMyMoleculesPageComponent } from './all-my-molecules.page.component';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { HistoryContextService } from '../../services/context/history-context.service';
import { ToastService } from '../../services/toast.service';
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service';
import { DomainInvalidationService } from '../../services/domain-invalidation.service';
import { RealtimeSyncStatusService } from '../../services/realtime-sync-status.service';
import { ScrollContextService } from '../../services/context/scroll-context.service';
import { SearchFieldComponent } from '../../components/common/search-field/search-field.component';
import { ButtonComponent } from '../../components/common/button/button.component';
import { PageModel } from '../../Models/graphql/page.models';
import { Helpers } from '../../helpers';
import { MoleculeCardItemModel } from '../../Models/graphql/molecule-collection/molecule-collection.types';

describe('AllMyMoleculesPageComponent: list states', () => {
  let fixture: ComponentFixture<AllMyMoleculesPageComponent>;
  let component: AllMyMoleculesPageComponent;
  let requests: Subject<PageModel<Record<string, unknown>>>[];
  let fetch: jasmine.Spy;
  let open: jasmine.Spy;
  const item = { id: 'one', name: 'Test', itemsCount: 2, createdAt: '2026-01-01' };
  const response = (items: Record<string, unknown>[], totalPages = 1, currentPage = 1) => ({ items, currentPage, totalPages, totalItems: items.length, itemCount: items.length, itemsPerPage: 25 });
  const settle = () => { tick(120); flushMicrotasks(); fixture.detectChanges(); };

  beforeEach(async () => {
    requests = [];
    fetch = jasmine.createSpy('getAllPaginatedItems').and.callFake(() => {
      const request = new Subject<PageModel<Record<string, unknown>>>();
      requests.push(request);
      return request;
    });
    open = jasmine.createSpy('open');
    spyOn(window, 'IntersectionObserver').and.returnValue({ observe: () => undefined, disconnect: () => undefined } as unknown as IntersectionObserver);
    spyOn(Helpers, 'moleculeClientToCardConverter').and.callFake(mol => ({ id: mol.id, triggerDisappear: signal(false), collapse: signal(false) } as MoleculeCardItemModel));
    await TestBed.configureTestingModule({
      imports: [AllMyMoleculesPageComponent],
      providers: [provideRouter([]),
        { provide: MoleculeCollectionItemService, useValue: { getAllPaginatedItems: fetch } },
        { provide: ActionOverlayContextService, useValue: { open } },
        { provide: HistoryContextService, useValue: {} },
        { provide: ToastService, useValue: {} },
        { provide: DomainInvalidationService, useValue: { last: signal(null) } },
        { provide: RealtimeSyncStatusService, useValue: { markSynchronized: () => undefined } },
        { provide: ScrollContextService, useValue: { intersectionRoot: () => null } },

      ]
    }).overrideComponent(AllMyMoleculesPageComponent, { set: {
      imports: [SearchFieldComponent, ButtonComponent, RouterLink], schemas: [CUSTOM_ELEMENTS_SCHEMA]
    } }).compileComponents();
  });
  beforeEach(fakeAsync(() => {
    fixture = TestBed.createComponent(AllMyMoleculesPageComponent); component = fixture.componentInstance;
    fixture.detectChanges(); flushMicrotasks(); fixture.detectChanges();
  }));
  afterEach(() => fixture.destroy());

  it('keeps initial loading separate from empty and error', fakeAsync(() => {
    expect(fixture.nativeElement.querySelector('.m-list-skeletons')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.m-list-empty')).toBeNull();
    expect(fixture.nativeElement.querySelector('.m-list-error')).toBeNull();
    requests[0].next(response([])); settle();
    expect(fixture.nativeElement.querySelector('.m-list-empty')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.m-list-skeletons')).toBeNull();
  }));

  it('debounces typing and Enter submits once without losing draft text', fakeAsync(() => {
    requests[0].next(response([])); settle();
    component.doQuery('a'); tick(100); component.doQuery('ab'); tick(200);
    expect(fetch.calls.count()).toBe(1);
    component.submitQuery('ab'); tick(250);
    expect(fetch.calls.count()).toBe(2);
    expect(fetch.calls.mostRecent().args).toEqual([1, 25, 'ab']);
    expect(component.searchInput()).toBe('ab');
    requests[1].next(response([])); settle();
  }));

  it('offers clearing a query with no results and retains the other list link', fakeAsync(() => {
    requests[0].next(response([])); settle(); component.submitQuery('missing');
    requests[1].next(response([])); settle();
    expect(fixture.nativeElement.querySelector('.m-list-empty').textContent).toContain('Nessun risultato');
    expect(fixture.nativeElement.querySelector('.m-list-link')).toBeTruthy();
    fixture.nativeElement.querySelector('.m-list-empty button').click(); flushMicrotasks();
    expect(component.searchInput()).toBe('');
    expect(fetch.calls.mostRecent().args).toEqual([1, 25, '']);
    requests[2].next(response([])); settle();
  }));

  it('shows initial error with retry instead of an empty collection', fakeAsync(() => {
    requests[0].error(new Error('offline')); settle();
    expect(fixture.nativeElement.querySelector('.m-list-empty')).toBeNull();
    expect(fixture.nativeElement.querySelector('.m-list-error')).toBeTruthy();
    fixture.nativeElement.querySelector('.m-list-error button').click();
    requests[1].next(response([item])); settle();
    expect(component.items.length).toBe(1);
    expect(fixture.nativeElement.querySelector('.m-list-error')).toBeNull();
  }));

  it('preserves loaded items after the next page fails and retries that page', fakeAsync(() => {
    requests[0].next(response([item], 2)); settle();
    fixture.nativeElement.querySelector('.m-list-pagination button').click();
    requests[1].error(new Error('offline')); settle();
    expect(component.items.length).toBe(1);
    expect(fixture.nativeElement.querySelector('.m-list-error').textContent).toContain('restano disponibili');
    fixture.nativeElement.querySelector('.m-list-error button').click();
    expect(fetch.calls.mostRecent().args).toEqual([2, 25, '']);
    requests[2].next(response([], 2, 2)); settle();
    expect(component.items.length).toBe(1);
    expect(fixture.nativeElement.querySelector('.m-list-end')).toBeTruthy();
  }));

  it('opens the original action context from the empty-state CTA', fakeAsync(() => {
    requests[0].next(response([])); settle();
    fixture.nativeElement.querySelector('.m-list-empty button').click(); flushMicrotasks();
    expect(open).toHaveBeenCalledOnceWith('SelectCollectionThenRoute', { importFromChembl: false });
  }));

  it('cancels an unsubmitted search when the page is destroyed', fakeAsync(() => {
    component.doQuery('pending'); fixture.destroy(); tick(300);
    expect(fetch.calls.count()).toBe(1);
  }));
});
