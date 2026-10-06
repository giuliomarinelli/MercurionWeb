import { signal } from '@angular/core'
import { fakeAsync, TestBed, tick } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router'
import { BehaviorSubject, of } from 'rxjs'
import { MoleculeEditorPageComponent } from './molecule-editor.page.component'
import { MoleculeEditorLiveAnalysisFacade } from './molecule-editor-live-analysis.facade'
import { MoleculeEditorDraftService } from '../../chemistry/molecule-editor-draft.service'
import { MoleculeEditorDraftInit } from '../../chemistry/molecule-editor-draft.service'
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service'
import { MoleculeService } from '../../services/graphql/molecule.service'
import { RdKitApiService } from '../../services/rd-kit-api.service'
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service'
import { ToastService } from '../../services/toast.service'
import { LoggerService } from '../../services/logger.service'

describe('Editor validation after restoring an unchanged structure', () => {
  let component: MoleculeEditorPageComponent
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>
  let lookup: jasmine.Spy
  let draft: MoleculeEditorDraftInit

  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ mode: 'create' }))
    lookup = jasmine.createSpy('lookup').and.returnValue(of(null))
    TestBed.configureTestingModule({ providers: [
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      { provide: Router, useValue: { navigate: jasmine.createSpy().and.resolveTo(true) } },
      { provide: MoleculeCollectionItemService, useValue: { findOneCustomMoleculeByCanonicalSmiles_shortFetch: lookup } },
      { provide: ActionOverlayContextService, useValue: {} },
      { provide: ToastService, useValue: { trigger: jasmine.createSpy() } },
      { provide: LoggerService, useValue: { error: jasmine.createSpy() } },
      { provide: RdKitApiService, useValue: { toCanonicalSmiles: ({ smiles }: { smiles: string }) => of(smiles) } },
      { provide: MoleculeService, useValue: { getPreferredNameItByCanonicalSmiles: () => of({ name: null }) } },
      { provide: MoleculeEditorLiveAnalysisFacade, useValue: { setContext: jasmine.createSpy() } },
      { provide: MoleculeEditorDraftService, useValue: {
        canUndo: signal(false), canRedo: signal(false),
        initialize: (init: MoleculeEditorDraftInit) => { draft = init; return { smiles: init.initialSmiles ?? init.baselineSmiles } },
        currentTab: () => draft.tab,
        record: jasmine.createSpy(),
        resetToBaseline: () => ({ smiles: draft.baselineSmiles })
      } }
    ] })
    component = TestBed.runInInjectionContext(() => new MoleculeEditorPageComponent())
    component.ngOnInit()
  })

  afterEach(() => component.ngOnDestroy())

  it('revalidates the same structure after a tab route change', fakeAsync(() => {
    component.onSmilesPollExported('C1CCCCC1')
    tick(301)
    expect(component.lock()).toBeFalse()
    params.next(convertToParamMap({ mode: 'create', smiles: 'C1CCCCC1', baseline_smiles: '', tab: 'live', destroy_cache: 'false' }))
    expect(component.lock()).toBeTrue()
    component.onSmilesPollExported('C1CCCCC1')
    tick(301)
    expect(component.lock()).toBeFalse()
    expect(lookup).toHaveBeenCalledTimes(2)
  }))

  it('allows redrawing the same valid structure after resetting to an empty baseline', fakeAsync(() => {
    component.onSmilesPollExported('C1CCCCC1')
    tick(301)
    component.handleReset()
    component.onSmilesPollExported('')
    component.onSmilesPollExported('C1CCCCC1')
    tick(301)
    expect(component.lock()).toBeFalse()
    expect(component.untouched()).toBeFalse()
  }))

  it('keeps an existing duplicate locked after a tab change', fakeAsync(() => {
    lookup.and.returnValue(of({ name: 'Existing molecule' }))
    component.onSmilesPollExported('C1CCCCC1')
    tick(301)
    params.next(convertToParamMap({ mode: 'create', smiles: 'C1CCCCC1', tab: 'live' }))
    component.onSmilesPollExported('C1CCCCC1')
    tick(301)
    expect(component.lock()).toBeTrue()
    expect(lookup).toHaveBeenCalledTimes(2)
  }))
})
