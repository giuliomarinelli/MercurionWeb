import { signal } from '@angular/core'
import { fakeAsync, TestBed, tick } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router'
import { BehaviorSubject, Observable, of, throwError } from 'rxjs'
import { EditorRequestScheduler } from '../../chemistry/editor-request-scheduler.service'
import { MoleculeEditorDraftService } from '../../chemistry/molecule-editor-draft.service'
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service'
import { MoleculeService } from '../../services/graphql/molecule.service'
import { RdKitApiService } from '../../services/rd-kit-api.service'
import { LoggerService } from '../../services/logger.service'
import { MoleculeEditorLiveAnalysisFacade } from './molecule-editor-live-analysis.facade'
import { MoleculeEditorPageComponent } from './molecule-editor.page.component'

describe('Editor identity cache across views', () => {
  let component: MoleculeEditorPageComponent
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>
  let canonical: jasmine.Spy
  let name: jasmine.Spy
  let duplicate: jasmine.Spy

  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ mode: 'create' }))
    canonical = jasmine.createSpy('canonical').and.callFake(({ smiles }: { smiles: string }) => of(smiles === 'OCC' ? 'CCO' : smiles))
    name = jasmine.createSpy('name').and.returnValue(of({ name: 'Etanolo', type: 'iupac' }))
    duplicate = jasmine.createSpy('duplicate').and.returnValue(of(null))
    TestBed.configureTestingModule({ providers: [
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      { provide: Router, useValue: { navigate: jasmine.createSpy().and.resolveTo(true) } },
      { provide: EditorRequestScheduler, useValue: { waiting: signal(null), run: <T>(_route: string, request: () => Observable<T>) => request() } },
      { provide: MoleculeCollectionItemService, useValue: { findOneCustomMoleculeByCanonicalSmiles_shortFetch: duplicate } },
      { provide: MoleculeService, useValue: { getPreferredNameItByCanonicalSmiles: name } },
      { provide: RdKitApiService, useValue: { toCanonicalSmiles: canonical } },
      { provide: LoggerService, useValue: { error: jasmine.createSpy() } },
      { provide: MoleculeEditorLiveAnalysisFacade, useValue: { setContext: jasmine.createSpy() } }
    ] })
    TestBed.inject(MoleculeEditorDraftService).clearAll()
    component = TestBed.runInInjectionContext(() => new MoleculeEditorPageComponent())
    component.ngOnInit()
  })

  afterEach(() => component.ngOnDestroy())

  function draw(smiles = 'OCC'): void {
    component.onSmilesPollExported(smiles)
    tick(301)
    TestBed.flushEffects()
  }

  function switchView(): void {
    params.next(convertToParamMap({ mode: 'create', smiles: 'OCC', tab: 'live', destroy_cache: 'false' }))
    draw()
  }

  it('reuses canonical SMILES and name but repeats duplicate validation after switching views', fakeAsync(() => {
    draw()
    expect(component.currentMoleculeName()).toBe('Etanolo')
    switchView()
    expect(canonical).toHaveBeenCalledTimes(1)
    expect(name).toHaveBeenCalledTimes(1)
    expect(duplicate).toHaveBeenCalledTimes(2)
    expect(component.currentCanonicalSmiles()).toBe('CCO')
    expect(component.currentMoleculeName()).toBe('Etanolo')
    expect(component.lock()).toBeFalse()
    draw('CCC')
    expect(canonical).toHaveBeenCalledTimes(2)
    expect(name).toHaveBeenCalledTimes(2)
  }))

  it('does not cache uniqueness or unlock save when the fresh duplicate check fails', fakeAsync(() => {
    draw()
    duplicate.and.returnValue(throwError(() => new Error('offline')))
    switchView()
    expect(canonical).toHaveBeenCalledTimes(1)
    expect(component.lock()).toBeTrue()
    expect(component.validationFailed()).toBeTrue()
    duplicate.and.returnValue(of({ id: 'existing', name: 'Existing molecule' }))
    component.retryIdentity(); tick(301); TestBed.flushEffects()
    expect(component.duplicateFound()).toBeTrue()
    expect(component.lock()).toBeTrue()
  }))

  it('caches a successful missing name, but retries a failed name lookup', fakeAsync(() => {
    name.and.returnValue(throwError(() => new Error('offline')))
    draw()
    expect(component.moleculeNameFailed()).toBeTrue()
    name.and.returnValue(of({ name: null, type: 'iupac' }))
    switchView()
    expect(name).toHaveBeenCalledTimes(2)
    expect(component.moleculeNameFailed()).toBeFalse()
    switchView()
    expect(name).toHaveBeenCalledTimes(2)
    expect(component.moleculeNameLoading()).toBeFalse()
  }))
})
