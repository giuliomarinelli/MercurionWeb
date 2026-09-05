import { TestBed } from '@angular/core/testing'

import { ChemistryEditorSession } from './chemistry-adapter.models'
import {
  CHEMISTRY_EDITOR_ADAPTER_LOADER,
  ChemistryEditorAdapterLoader,
  ChemistryEditorService
} from './chemistry-editor.service'
import { ChemistryRendererService } from './chemistry-renderer.service'

describe('ChemistryEditorService', () => {
  it('loads the Ketcher protocol adapter only when an editor session is requested', async () => {
    const session = jasmine.createSpyObj<ChemistryEditorSession>(
      'ChemistryEditorSession',
      ['attach', 'onStateChange', 'setStructure', 'exportStructure', 'dispose'],
      { resourceUrl: '/ketcher/index.html' }
    )
    const createAdapter = jasmine.createSpy('createKetcherEditorAdapter').and.returnValue(session)
    const loader = jasmine.createSpy<ChemistryEditorAdapterLoader>('loader')
      .and.resolveTo({ createKetcherEditorAdapter: createAdapter })

    TestBed.configureTestingModule({
      providers: [
        ChemistryEditorService,
        { provide: ChemistryRendererService, useValue: { toMolfile: jasmine.createSpy('toMolfile') } },
        { provide: CHEMISTRY_EDITOR_ADAPTER_LOADER, useValue: loader }
      ]
    })

    const service = TestBed.inject(ChemistryEditorService)
    expect(loader).not.toHaveBeenCalled()

    await service.createSession('/ketcher/index.html')

    expect(loader).toHaveBeenCalledTimes(1)
    expect(createAdapter).toHaveBeenCalledWith(jasmine.objectContaining({
      resourceUrl: '/ketcher/index.html'
    }))
  })
})
