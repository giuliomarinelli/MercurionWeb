import { EditorRequestScheduler } from '../../chemistry/editor-request-scheduler.service'
import type { Observable } from 'rxjs'
import { signal } from '@angular/core'
import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router'
import { BehaviorSubject, of, Subject, throwError } from 'rxjs'
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
  let canonical: jasmine.Spy
  let open: jasmine.Spy
  let draft: MoleculeEditorDraftInit

  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ mode: 'create' }))
    lookup = jasmine.createSpy('lookup').and.returnValue(of(null))
    canonical = jasmine.createSpy('canonical').and.callFake(({ smiles }: { smiles: string }) => of(smiles))
    open = jasmine.createSpy('open')
    TestBed.configureTestingModule({ providers: [
        { provide: EditorRequestScheduler, useValue: { waiting: signal(null), run: <T>(_route: string, request: () => Observable<T>) => request() } },
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      { provide: Router, useValue: { navigate: jasmine.createSpy().and.resolveTo(true) } },
      { provide: MoleculeCollectionItemService, useValue: { findOneCustomMoleculeByCanonicalSmiles_shortFetch: lookup } },
      { provide: ActionOverlayContextService, useValue: { open } },
      { provide: ToastService, useValue: { trigger: jasmine.createSpy() } },
      { provide: LoggerService, useValue: { error: jasmine.createSpy() } },
      { provide: RdKitApiService, useValue: { toCanonicalSmiles: canonical } },
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

  it('cancels the pending sample when the drawing becomes empty', fakeAsync(() => {
    component.onSmilesPollExported('CC'); tick(100)
    component.onSmilesPollExported(''); tick(400)
    expect(canonical).not.toHaveBeenCalled()
    expect(component.currentCanonicalSmiles()).toBe('')
    expect(component.lock()).toBeTrue()
  }))

  it('rejects a late REST response after clearing or invalidating the editor', fakeAsync(() => {
    const response = new Subject<string>()
    canonical.and.returnValue(response)
    component.onSmilesPollExported('CC'); tick(301)
    component.onSmilesPollExported('')
    response.next('CC'); response.complete(); tick(301)
    expect(component.currentCanonicalSmiles()).toBe('')
    expect(component.lock()).toBeTrue()
    expect(lookup).not.toHaveBeenCalled()
  }))

  it('revalidates A after A -> empty -> A without requiring a reset', fakeAsync(() => {
    component.onSmilesPollExported('CC'); tick(301)
    component.onSmilesPollExported('')
    component.onSmilesPollExported('CC'); tick(301)
    expect(component.currentCanonicalSmiles()).toBe('CC')
    expect(component.lock()).toBeFalse()
    expect(lookup).toHaveBeenCalledTimes(2)
  }))

  it('invalidates old duplicate validation immediately, before the next canonical result', fakeAsync(() => {
    const response = new Subject<null>()
    lookup.and.returnValue(response)
    component.onSmilesPollExported('CC'); tick(301)
    component.onSmilesPollExported('CCC')
    response.next(null); response.complete()
    expect(component.lock()).toBeTrue()
    expect(component.currentCanonicalSmiles()).toBe('')
    component.onSmilesPollExported(''); tick(301)
  }))

  it('keeps save closed on duplicate failure and supports explicit retry of identical input', fakeAsync(() => {
    lookup.and.returnValue(throwError(() => ({ status: 429 })))
    component.onSmilesPollExported('CC'); tick(301)
    expect(component.lock()).toBeTrue()
    expect(component.validationFailed()).toBeTrue()
    lookup.and.returnValue(of(null))
    component.retryIdentity(); tick(301)
    expect(component.lock()).toBeFalse()
    expect(component.validationFailed()).toBeFalse()
  }))

  it('never opens the save overlay if the fresh duplicate check fails', fakeAsync(() => {
    component.onSmilesPollExported('CC'); tick(301)
    lookup.and.returnValue(throwError(() => ({ status: 429 })))
    component.onSaveAsNew(); void component.onSmilesExported('CC'); flushMicrotasks()
    expect(open).not.toHaveBeenCalled()
    expect(component.lock()).toBeTrue()
    expect(component.pendingAction()).toBeNull()
  }))

  it('does not save an export after a newer structure arrives during validation', fakeAsync(() => {
    component.onSmilesPollExported('CC'); tick(301)
    const response = new Subject<null>()
    lookup.and.returnValue(response)
    component.onSaveAsNew(); void component.onSmilesExported('CC'); flushMicrotasks()
    component.onSmilesPollExported('CCC')
    response.next(null); response.complete(); flushMicrotasks()
    expect(open).not.toHaveBeenCalled()
    component.onSmilesPollExported(''); tick(301)
  }))

  it('loads a raw draft without labelling it canonical before remote validation', () => {
    params.next(convertToParamMap({ mode: 'duplicate', smiles: 'C(C)O' }))
    expect(component.smiles()).toBe('C(C)O')
    expect(component.currentCanonicalSmiles()).toBe('')
    expect(component.lock()).toBeTrue()
  })

  it('requires a fresh export after an export failure, including when retry is clicked', fakeAsync(() => {
    component.onSmilesPollExported('CC'); tick(301)
    component.handleExportFailure()
    component.retryIdentity(); tick(301)
    expect(component.lock()).toBeTrue()
    expect(component.currentCanonicalSmiles()).toBe('')
    expect(canonical).toHaveBeenCalledTimes(1)
    expect(component.triggerGetSmiles()).toBeTrue()
    void component.onSmilesExported('CCC'); tick(301)
    expect(component.currentCanonicalSmiles()).toBe('CCC')
    expect(component.lock()).toBeFalse()
  }))
})
