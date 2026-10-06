import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, NEVER, Subject, of } from 'rxjs';
import { MoleculeDetailPageComponent } from './molecule-detail.page.component';
import { MoleculeDetailFacade } from './molecule-detail.facade';
import { BindCollectionsToMoleculeComponent } from '../../components/action-components/bind-collections-to-molecule/bind-collections-to-molecule.component';
import { MoleculeCollectionItemClient, BindManyCollectionsToMoleculeDTO, MoleculeCollectionJoin } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service';
import { UserContextService } from '../../services/context/user-context.service';
import { DomainInvalidationService } from '../../services/domain-invalidation.service';
import { MercurionAiService } from '../../services/mercurion-ai.service';
import { EmbeddingService } from '../../services/embedding.service';
import { HistoryContextService } from '../../services/context/history-context.service';
import { BindCollectionsToMoleculeContextService } from '../../services/context/action-context/bind-collections-to-molecule-context.service';
import { ChemistryRendererService } from '../../chemistry/chemistry-renderer.service';
import { PcpApiService } from '../../services/pcp-api.service';
import { ToastService } from '../../services/toast.service';

describe('Molecule detail after binding collections', () => {
  const moleculeId = '019b80d4-faa0-7000-af01-35947e9f4d6c';
  let page: ComponentFixture<MoleculeDetailPageComponent>;
  let bindDialog: ComponentFixture<BindCollectionsToMoleculeComponent>;
  let item: MoleculeCollectionItemClient;
  let getItem: jasmine.Spy;
  let mutation: Subject<BindManyCollectionsToMoleculeDTO>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const join = (id: string, name: string): MoleculeCollectionJoin => ({
    id: `join-${id}`, collection: {
      id, name, itemsCount: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01', touchedAt: '2026-01-01'
    }
  });

  beforeEach(async () => {
    mutation = new Subject();
    params = new BehaviorSubject(convertToParamMap({ molId: moleculeId }));
    getItem = jasmine.createSpy('getItemById').and.callFake(() => of(item));
    await TestBed.configureTestingModule({
      imports: [MoleculeDetailPageComponent, BindCollectionsToMoleculeComponent],
      providers: [
        { provide: ActivatedRoute, useValue: {
          paramMap: params, queryParamMap: of(convertToParamMap({})),
          snapshot: { queryParamMap: convertToParamMap({}) }
        } },
        { provide: UserContextService, useValue: { isLoggedIn: () => true } },
        { provide: MoleculeCollectionItemService, useValue: {
          getItemById: getItem, markItemAsTouched: () => of(false)
        } },
        { provide: MoleculeCollectionService, useValue: {
          getPaginatedCollections: () => NEVER, bindManyCollectionsToMolecule: () => mutation
        } },
        { provide: BindCollectionsToMoleculeContextService, useValue: {
          moleculeId: signal(moleculeId), moleculeName: signal('Molecola')
        } },
        { provide: MercurionAiService, useValue: { t1Inference: () => of(undefined) } },
        { provide: EmbeddingService, useValue: { getSimilarMolregnos: () => of([]) } },
        { provide: HistoryContextService, useValue: {} },
        { provide: ChemistryRendererService, useValue: { createSession: async () => ({
          renderSvg: async () => '<svg viewBox="0 0 10 10"></svg>', dispose: () => undefined
        }) } },
        { provide: PcpApiService, useValue: { getIupacNameFromSmiles: () => of('propane') } },
        { provide: ToastService, useValue: { trigger: jasmine.createSpy('trigger') } }
      ]
    }).compileComponents();
    // Keep route parameters unchanged, as Angular does for same-URL navigation.
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
  });

  afterEach(() => {
    bindDialog?.destroy();
    page?.destroy();
  });

  function render(type: 'custom' | 'chembl' = 'custom', joins = [join('a', 'Collezione A')]) {
    const base = { id: moleculeId, type, joins, touchedAt: '' };
    item = type === 'custom' ? { ...base, type, name: 'Molecola', canonicalSmiles: 'CCC' }
      : { ...base, type, chemblMolregno: 1714574, chemblDetails: {
        id: 1714574, preferredName: 'TERCONAZOLO', preferredNameIt: null, cmbId: 'CHEMBL1714574',
        canonicalSmiles: 'CCC', synonyms: [], moleculeType: null, maxPhase: 4,
        naturalProduct: false, prodrug: false, blackBoxWarning: false,
        administrationRoutes: { oral: false, parenteral: false, topical: true },
        properties: { mwFreebase: 532.5, alogp: 2, hba: 5, hbd: 0, psa: 40, rtb: 7 }
      } };
    page = TestBed.createComponent(MoleculeDetailPageComponent);
    page.detectChanges();
    bindDialog = TestBed.createComponent(BindCollectionsToMoleculeComponent);
    bindDialog.detectChanges();
    flushMicrotasks();
    bindDialog.componentInstance.onSelectAllChange(true);
    bindDialog.componentInstance.doSubmit();
  }

  for (const type of ['custom', 'chembl'] as const) {
    it(`rerenders the ${type} molecule's collection cards after a successful bind on the same URL`, fakeAsync(() => {
      render(type);
      expect(page.nativeElement.querySelector('m-my-molecule-join').textContent).toContain('Collezione A');
      expect(getItem).toHaveBeenCalledTimes(1);
      item = { ...item, joins: [...item.joins, join('b', 'Collezione B'), join('c', 'Collezione C')] };
      mutation.next({ ok: true, moleculeUUID: moleculeId });
      page.detectChanges();
      flushMicrotasks();
      page.detectChanges();
      const cards = page.nativeElement.querySelectorAll('m-my-molecule-join m-collection-card');
      expect(cards.length).toBe(3);
      expect(cards[1].textContent).toContain('Collezione B');
      expect(cards[2].textContent).toContain('Collezione C');
      expect(getItem).toHaveBeenCalledTimes(2);
      expect(page.debugElement.injector.get(MoleculeDetailFacade).loading()).toBeFalse();
      tick(2100);
    }));
  }

  it('renders the first associated collection when the molecule previously had none', fakeAsync(() => {
    render('custom', []);
    item = { ...item, joins: [join('b', 'Collezione B')] };
    mutation.next({ ok: true, moleculeUUID: moleculeId });
    page.detectChanges();
    flushMicrotasks();
    page.detectChanges();
    expect(page.nativeElement.querySelector('m-my-molecule-join').textContent).toContain('Collezione B');
    expect(getItem).toHaveBeenCalledTimes(2);
    tick(2100);
  }));

  it('does not reload on an unsuccessful bind or a binding for another molecule', fakeAsync(() => {
    render();
    mutation.next({ ok: false, moleculeUUID: null });
    page.detectChanges();
    flushMicrotasks();
    TestBed.inject(DomainInvalidationService).publish({
      domain: 'molecule', action: 'collections-bound', moleculeId: 'another-molecule'
    });
    page.detectChanges();
    flushMicrotasks();
    expect(getItem).toHaveBeenCalledTimes(1);
    tick(2100);
  }));
});
