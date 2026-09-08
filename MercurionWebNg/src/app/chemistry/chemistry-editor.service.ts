import { Inject, Injectable, InjectionToken } from '@angular/core'

import {
  ChemistryAdapterError,
  ChemistryEditorSession
} from './chemistry-adapter.models'
import { ChemistryRendererService } from './chemistry-renderer.service'

export type ChemistryEditorAdapterLoader = () => Promise<{
  createKetcherEditorAdapter(options: {
    resourceUrl: string
    targetOrigin: string
    toMolfile(structure: string): Promise<string | undefined>
  }): ChemistryEditorSession
}>

export const CHEMISTRY_EDITOR_ADAPTER_LOADER =
  new InjectionToken<ChemistryEditorAdapterLoader>('CHEMISTRY_EDITOR_ADAPTER_LOADER', {
    providedIn: 'root',
    factory: () => () => import('./adapters/ketcher-editor.adapter')
  })

@Injectable({ providedIn: 'root' })
export class ChemistryEditorService {
  private adapterModulePromise?: ReturnType<ChemistryEditorAdapterLoader>

  constructor(
    private readonly renderer: ChemistryRendererService,
    @Inject(CHEMISTRY_EDITOR_ADAPTER_LOADER)
    private readonly loadAdapterModule: ChemistryEditorAdapterLoader
  ) {}

  async createSession(resourceUrl: string): Promise<ChemistryEditorSession> {
    try {
      const module = await this.getAdapterModule()
      return module.createKetcherEditorAdapter({
        resourceUrl,
        targetOrigin: window.location.origin,
        toMolfile: structure => this.renderer.toMolfile(structure)
      })
    } catch (error) {
      this.adapterModulePromise = undefined
      if (error instanceof ChemistryAdapterError) throw error
      throw new ChemistryAdapterError('adapter-load-failed', 'Impossibile caricare l’editor molecolare.')
    }
  }

  private getAdapterModule(): ReturnType<ChemistryEditorAdapterLoader> {
    this.adapterModulePromise ??= this.loadAdapterModule()
    return this.adapterModulePromise
  }
}
