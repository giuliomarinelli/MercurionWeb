import { TestBed } from '@angular/core/testing'

import {
  ChemistryAdapterError,
  ChemistryRendererAdapter,
  ChemistryRendererSession
} from './chemistry-adapter.models'
import {
  CHEMISTRY_RENDERER_ADAPTER_LOADER,
  ChemistryRendererAdapterLoader,
  ChemistryRendererService
} from './chemistry-renderer.service'

describe('ChemistryRendererService', () => {
  let loader: jasmine.Spy<ChemistryRendererAdapterLoader>
  let createAdapter: jasmine.Spy<() => Promise<ChemistryRendererAdapter>>
  let adapter: jasmine.SpyObj<ChemistryRendererAdapter>
  let session: jasmine.SpyObj<ChemistryRendererSession>

  beforeEach(() => {
    session = jasmine.createSpyObj<ChemistryRendererSession>(
      'ChemistryRendererSession',
      ['renderSvg', 'toMolfile', 'getMoleculeProperties', 'dispose']
    )
    adapter = jasmine.createSpyObj<ChemistryRendererAdapter>('ChemistryRendererAdapter', ['createSession'])
    adapter.createSession.and.returnValue(session)
    createAdapter = jasmine.createSpy('createRdKitRendererAdapter').and.resolveTo(adapter)
    loader = jasmine.createSpy('loader').and.resolveTo({ createRdKitRendererAdapter: createAdapter })

    TestBed.configureTestingModule({
      providers: [
        ChemistryRendererService,
        { provide: CHEMISTRY_RENDERER_ADAPTER_LOADER, useValue: loader }
      ]
    })
  })

  it('does not import or initialize RDKit until a renderer session is requested', async () => {
    const service = TestBed.inject(ChemistryRendererService)
    expect(loader).not.toHaveBeenCalled()

    await service.createSession()

    expect(loader).toHaveBeenCalledTimes(1)
    expect(createAdapter).toHaveBeenCalledTimes(1)
  })

  it('shares one concurrent SDK initialization across callers', async () => {
    const service = TestBed.inject(ChemistryRendererService)

    await Promise.all([service.createSession(), service.createSession()])

    expect(loader).toHaveBeenCalledTimes(1)
    expect(createAdapter).toHaveBeenCalledTimes(1)
    expect(adapter.createSession).toHaveBeenCalledTimes(2)
  })

  it('maps loader failures to a canonical recoverable error and permits retry', async () => {
    loader.and.rejectWith(new Error('raw vendor failure'))
    const service = TestBed.inject(ChemistryRendererService)

    await expectAsync(service.createSession()).toBeRejectedWith(
      jasmine.objectContaining<Partial<ChemistryAdapterError>>({
        code: 'adapter-load-failed',
        recoverable: true
      })
    )

    loader.and.resolveTo({ createRdKitRendererAdapter: createAdapter })
    await service.createSession()
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('uses and disposes a short-lived session for property calculations', async () => {
    const properties = { mwFreebase: 12, alogp: 1, hba: 2, hbd: 3, psa: 4, rtb: 5 }
    session.getMoleculeProperties.and.resolveTo(properties)
    const service = TestBed.inject(ChemistryRendererService)

    await expectAsync(service.getMoleculeProperties('CC')).toBeResolvedTo(properties)
    expect(session.dispose).toHaveBeenCalledTimes(1)
  })
})
