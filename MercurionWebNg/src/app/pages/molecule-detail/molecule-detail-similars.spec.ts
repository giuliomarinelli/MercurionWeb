import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, EMPTY, of, Subject } from 'rxjs';
import { MoleculeDetailFacade } from './molecule-detail.facade';
import { MoleculeDetail } from '../../Models/graphql/molecule.detail.models';
import { MoleculeSearchResult } from '../../Models/graphql/molecule-search/molecule-search-result.interface';
import { MoleculeService } from '../../services/graphql/molecule.service';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service';
import { TypeGuardsService } from '../../services/type-guards.service';
import { UserContextService } from '../../services/context/user-context.service';
import { MercurionAiService } from '../../services/mercurion-ai.service';
import { EmbeddingService } from '../../services/embedding.service';
import { AppTitleService } from '../../services/app-title.service';
import { AuthSessionPersistenceService } from '../../services/auth-session-persistence.service';
import { DomainInvalidationService } from '../../services/domain-invalidation.service';
import { RealtimeSyncStatusService } from '../../services/realtime-sync-status.service';
import { HistoryContextService } from '../../services/context/history-context.service';
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service';
import { ToastService } from '../../services/toast.service';
import { LoggerService } from '../../services/logger.service';

describe('MoleculeDetailFacade similar requests', () => {
  let facade: MoleculeDetailFacade;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let secondDetail: Subject<MoleculeDetail>;
  let firstSimilar: Subject<MoleculeSearchResult[]>;
  let secondSimilar: Subject<MoleculeSearchResult[]>;
  const molecule = (id: number) => ({ id, canonicalSmiles: 'C' } as MoleculeDetail);
  const preview = { known: true } as MoleculeSearchResult;

  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ molId: '1' }));
    secondDetail = new Subject<MoleculeDetail>();
    firstSimilar = new Subject<MoleculeSearchResult[]>();
    secondSimilar = new Subject<MoleculeSearchResult[]>();
    TestBed.configureTestingModule({ providers: [
      MoleculeDetailFacade,
      TypeGuardsService,
      { provide: ActivatedRoute, useValue: {
        paramMap: params, queryParamMap: EMPTY, snapshot: { queryParamMap: convertToParamMap({}) }
      } },
      { provide: MoleculeService, useValue: {
        getMoleculeByMolregno: (id: string) => id === '1' ? of(molecule(1)) : secondDetail,
        getMoleculePreviewsByMolregnos: (ids: string[]) => ids[0] === '1' ? firstSimilar : secondSimilar
      } },
      { provide: EmbeddingService, useValue: { getSimilarMolregnos: (id: string) => of([Number(id)]) } },
      { provide: UserContextService, useValue: { isLoggedIn: () => false } },
      { provide: MoleculeCollectionItemService, useValue: {} },
      { provide: MoleculeCollectionService, useValue: {} },
      { provide: MercurionAiService, useValue: {} },
      { provide: AppTitleService, useValue: { setSection: () => undefined } },
      { provide: AuthSessionPersistenceService, useValue: {} },
      { provide: DomainInvalidationService, useValue: { last: signal(null) } },
      { provide: RealtimeSyncStatusService, useValue: {} },
      { provide: HistoryContextService, useValue: {} },
      { provide: ActionOverlayContextService, useValue: {} },
      { provide: ToastService, useValue: {} },
      { provide: LoggerService, useValue: { error: jasmine.createSpy('error') } }
    ] });
    facade = TestBed.inject(MoleculeDetailFacade);
    facade.molecule$.subscribe();
  });

  it('clears the previous results and restarts loading as soon as a new molecule is requested', () => {
    firstSimilar.next([preview]);
    expect(facade.similar()).toEqual([preview]);
    expect(facade.similarLoading()).toBeFalse();

    params.next(convertToParamMap({ molId: '2' }));
    expect(facade.similar()).toEqual([]);
    expect(facade.similarLoading()).toBeTrue();

    secondDetail.next(molecule(2));
    secondSimilar.next([]);
    expect(facade.similarLoading()).toBeFalse();
  });

  it('cancels the old request so its late response cannot replace the new results', () => {
    expect(firstSimilar.observed).toBeTrue();
    params.next(convertToParamMap({ molId: '2' }));
    expect(firstSimilar.observed).toBeFalse();
    secondDetail.next(molecule(2));
    secondSimilar.next([preview]);
    firstSimilar.next([]);

    expect(facade.similar()).toEqual([preview]);
    expect(facade.similarLoading()).toBeFalse();

    TestBed.resetTestingModule();
    expect(secondSimilar.observed).toBeFalse();
  });
});
