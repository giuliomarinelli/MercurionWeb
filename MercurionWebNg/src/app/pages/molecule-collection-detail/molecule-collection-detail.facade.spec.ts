import { signal } from '@angular/core';
import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { EMPTY, of, Subject } from 'rxjs';
import { MoleculeCollectionDetailFacade } from './molecule-collection-detail.facade';
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { DomainInvalidationService } from '../../services/domain-invalidation.service';
import { HistoryContextService } from '../../services/context/history-context.service';
import { ToastService } from '../../services/toast.service';
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service';
import { AppTitleService } from '../../services/app-title.service';
import { ActivatedRoute } from '@angular/router';
import { MoleculeCardItemModel, MoleculeCollectionItemClient } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { PageModel } from '../../Models/graphql/page.models';

describe('MoleculeCollectionDetailFacade invalidations', () => {
  let facade: MoleculeCollectionDetailFacade;
  let fetchPage: jasmine.Spy;
  const row = () => ({ id: 'molecule-1', type: 'custom', name: 'Example', triggerDisappear: signal(false), collapse: signal(false) } as MoleculeCardItemModel);
  const page = () => ({ items: [{ id: 'molecule-1', type: 'custom', name: 'Example' }], currentPage: 1, totalPages: 1 });

  beforeEach(() => {
    fetchPage = jasmine.createSpy('fetchPage').and.returnValue(of(page()));
    TestBed.configureTestingModule({ providers: [
      MoleculeCollectionDetailFacade,
      { provide: ActivatedRoute, useValue: { paramMap: EMPTY } },
      { provide: MoleculeCollectionService, useValue: {} },
      { provide: MoleculeCollectionItemService, useValue: { getPaginatedItemsForCollection: fetchPage } },
      { provide: HistoryContextService, useValue: {} },
      { provide: ToastService, useValue: {} },
      { provide: ActionOverlayContextService, useValue: {} },
      { provide: AppTitleService, useValue: {} }
    ] });
    facade = TestBed.inject(MoleculeCollectionDetailFacade);
    facade.collectionId.set('collection-1');
    facade.items.set([row()]);
    TestBed.flushEffects();
  });

  it('reloads once for a displayed molecule event without repeating after the list is replaced', fakeAsync(() => {
    TestBed.inject(DomainInvalidationService).publish({ domain: 'molecule', action: 'changed', remote: true, resourceId: 'molecule-1' });
    for (let i = 0; i < 4; i++) {
      TestBed.flushEffects();
      flushMicrotasks();
    }
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(facade.items().map(item => item.id)).toEqual(['molecule-1']);

    facade.items.set([row()]);
    TestBed.flushEffects();
    flushMicrotasks();
    expect(fetchPage).toHaveBeenCalledTimes(1);
    tick(2600);
    TestBed.resetTestingModule();
  }));

  it('ignores a remote update for a molecule outside the displayed collection', fakeAsync(() => {
    TestBed.inject(DomainInvalidationService).publish({ domain: 'molecule', action: 'changed', remote: true, resourceId: 'other-molecule' });
    TestBed.flushEffects();
    facade.items.set([row()]);
    TestBed.flushEffects();
    flushMicrotasks();
    expect(fetchPage).not.toHaveBeenCalled();
  }));

  it('cancels pending pagination and refuses a delayed reload after destruction', fakeAsync(() => {
    const response = new Subject<PageModel<MoleculeCollectionItemClient>>();
    fetchPage.and.returnValue(response);
    void facade.reload();
    expect(response.observed).toBeTrue();
    TestBed.resetTestingModule();
    flushMicrotasks();
    expect(response.observed).toBeFalse();
    void facade.reload();
    expect(fetchPage).toHaveBeenCalledTimes(1);
  }));
});
