import { signal } from '@angular/core'
import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router'
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs'
import { MoleculeEditorPageComponent } from './molecule-editor.page.component'
import { MoleculeEditorLiveAnalysisFacade } from './molecule-editor-live-analysis.facade'
import { MoleculeEditorDraftService } from '../../chemistry/molecule-editor-draft.service'
import { EditorRequestScheduler } from '../../chemistry/editor-request-scheduler.service'
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service'
import { MoleculeService } from '../../services/graphql/molecule.service'
import { RdKitApiService } from '../../services/rd-kit-api.service'
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service'
import { ToastService } from '../../services/toast.service'
import { LoggerService } from '../../services/logger.service'

describe('Editor save lifecycle and route recovery', () => {
  let component: MoleculeEditorPageComponent
  let mutation: Subject<{ id: string } | null>
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>
  let clearDraft: jasmine.Spy
  let acceptBaseline: jasmine.Spy
  let navigate: jasmine.Spy
  let navigateTab: jasmine.Spy
  let update: jasmine.Spy
  let load: jasmine.Spy
  let props: jasmine.Spy
  beforeEach(() => {
    mutation = new Subject()
    params = new BehaviorSubject(convertToParamMap({ mode: 'edit', m_id: 'fixture' }))
    clearDraft = jasmine.createSpy('clearDraft')
    acceptBaseline = jasmine.createSpy('acceptBaseline')
    navigate = jasmine.createSpy('navigate').and.resolveTo(true)
    navigateTab = jasmine.createSpy('navigateTab').and.resolveTo(false)
    update = jasmine.createSpy('update').and.returnValue(mutation)
    load = jasmine.createSpy('load').and.returnValue(of({ canonicalSmiles: 'CC' }))
    props = jasmine.createSpy('props').and.returnValue(of({}))
    TestBed.configureTestingModule({ providers: [
      { provide: EditorRequestScheduler, useValue: { waiting: signal(null), run: <T>(_route: string, request: () => Observable<T>) => request() } },
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      { provide: Router, useValue: { navigateByUrl: navigate, navigate: navigateTab } },
      { provide: MoleculeCollectionItemService, useValue: {
        getCustomSmilesById: load,
        findOneCustomMoleculeByCanonicalSmiles_shortFetch: () => of(null),
        updateItemCanonicalSmiles: update
      } },
      { provide: ActionOverlayContextService, useValue: { open: jasmine.createSpy() } },
      { provide: ToastService, useValue: { trigger: jasmine.createSpy() } },
      { provide: LoggerService, useValue: { error: jasmine.createSpy() } },
      { provide: RdKitApiService, useValue: {
        toCanonicalSmiles: ({ smiles }: { smiles: string }) => of(smiles), getMoleculeProperties: props
      } },
      { provide: MoleculeService, useValue: { getPreferredNameItByCanonicalSmiles: () => of({ name: null }) } },
      { provide: MoleculeEditorLiveAnalysisFacade, useValue: { setContext: jasmine.createSpy() } },
      { provide: MoleculeEditorDraftService, useValue: {
        canUndo: signal(false), canRedo: signal(false),
        initialize: ({ baselineSmiles }: { baselineSmiles: string }) => ({ smiles: baselineSmiles }), currentTab: () => 'std',
        record: jasmine.createSpy(), clearCurrent: clearDraft, acceptSavedBaseline: acceptBaseline, setTab: jasmine.createSpy()
      } }
    ] })
    component = TestBed.runInInjectionContext(() => new MoleculeEditorPageComponent())
    component.ngOnInit()
  })
  afterEach(() => component.ngOnDestroy())

  function submit(): void {
    component.onSmilesPollExported('CCC'); tick(301)
    component.onSave(); void component.onSmilesExported('CCC'); flushMicrotasks()
  }

  it('keeps save pending and rejects repeated commands/exports until the mutation answers', fakeAsync(() => {
    submit()
    expect(mutation.observed).toBeTrue()
    expect(component.pendingAction()).toBe('save')
    component.onSaveAsNew(); component.onSave(); void component.onSmilesExported('CCC'); flushMicrotasks()
    expect(component.pendingAction()).toBe('save')
    expect(update).toHaveBeenCalledTimes(1)
    mutation.next({ id: 'fixture' }); flushMicrotasks()
    expect(component.pendingAction()).toBeNull()
    expect(clearDraft).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledOnceWith('/molecules/detail/fixture')
  }))

  it('preserves a newer drawing and its draft instead of navigating on an older mutation response', fakeAsync(() => {
    submit()
    component.onSmilesPollExported('CCCC'); tick(301)
    mutation.next({ id: 'fixture' }); flushMicrotasks()
    expect(clearDraft).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(acceptBaseline).toHaveBeenCalledOnceWith('fixture', 'CCC')
    expect(component.baselineSmiles()).toBe('CCC')
    expect(component.currentCanonicalSmiles()).toBe('CCCC')
    expect(component.pendingAction()).toBeNull()
  }))

  it('does not release save while a poll export fails during the mutation', fakeAsync(() => {
    submit()
    component.handleExportFailure()
    expect(component.pendingAction()).toBe('save')
    component.onSave()
    expect(update).toHaveBeenCalledTimes(1)
    mutation.next({ id: 'fixture' }); flushMicrotasks()
    expect(clearDraft).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  }))

  it('ignores a mutation response after the route changes to a different context', fakeAsync(() => {
    submit()
    params.next(convertToParamMap({ mode: 'create' }))
    mutation.next({ id: 'fixture' }); flushMicrotasks()
    expect(clearDraft).not.toHaveBeenCalled()
    expect(acceptBaseline).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  }))

  it('bounds a missing write response without retrying the write or discarding the draft', fakeAsync(() => {
    submit()
    tick(15000); flushMicrotasks()
    expect(component.pendingAction()).toBeNull()
    expect(component.saveUnconfirmed()).toBeTrue()
    expect(component.editorStatus().kind).toBe('error')
    component.onSave(); void component.onSmilesExported('CCC'); tick(301); flushMicrotasks()
    expect(update).toHaveBeenCalledTimes(1)
    expect(clearDraft).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    mutation.next({ id: 'fixture' }); flushMicrotasks()
    expect(navigate).not.toHaveBeenCalled()
  }))

  it('preserves the draft on a mutation error and blocks resubmission of an uncertain write', fakeAsync(() => {
    submit()
    mutation.error(new Error('Transport failed')); flushMicrotasks()
    expect(component.pendingAction()).toBeNull()
    expect(component.saveUnconfirmed()).toBeTrue()
    expect(clearDraft).not.toHaveBeenCalled()
    component.onSave(); expect(component.pendingAction()).toBeNull()
    expect(update).toHaveBeenCalledTimes(1)
  }))

  it('keeps an uncertain write blocked across view changes for the same molecule', fakeAsync(() => {
    submit()
    mutation.error(new Error('Transport failed')); flushMicrotasks()
    params.next(convertToParamMap({ mode: 'edit', m_id: 'fixture', tab: 'live', destroy_cache: 'false' }))
    component.onSmilesPollExported('CCC'); tick(301)
    component.onSave()
    expect(component.saveUnconfirmed()).toBeTrue()
    expect(component.pendingAction()).toBeNull()
    expect(update).toHaveBeenCalledTimes(1)
  }))

  it('does not label a confirmed write uncertain when only the subsequent navigation fails', fakeAsync(() => {
    navigate.and.rejectWith(new Error('Navigation failed'))
    submit()
    mutation.next({ id: 'fixture' }); flushMicrotasks()
    expect(component.saveUnconfirmed()).toBeFalse()
    expect(component.pendingAction()).toBeNull()
    expect(component.lock()).toBeTrue()
  }))

  it('never submits an obsolete structure if drawing changes while fetching properties', fakeAsync(() => {
    const delayed = new Subject<object>()
    props.and.returnValue(delayed)
    submit()
    component.onSmilesPollExported('CCCC'); tick(301)
    delayed.next({}); flushMicrotasks()
    expect(update).not.toHaveBeenCalled()
    expect(component.pendingAction()).toBeNull()
  }))

  it('recovers from a failed edit load when a valid route arrives in the same component', () => {
    load.and.returnValue(throwError(() => new Error('Not found')))
    params.next(convertToParamMap({ mode: 'edit', m_id: 'missing' }))
    expect(component.error()).toBeTrue()
    params.next(convertToParamMap({ mode: 'create' }))
    expect(component.error()).toBeFalse()
    expect(component.mode()).toBe('create')
  })

  it('contains a rejected view navigation and releases the view-change state', fakeAsync(() => {
    navigateTab.and.rejectWith(new Error('Navigation failed'))
    component.onEditorTabChange('live'); void component.onSmilesExported('CCC'); flushMicrotasks()
    expect(component.pendingTabChange()).toBeNull()
    expect(component.smiles()).toBe('CCC')
    expect(component.tab()).toBe('std')
  }))
})
