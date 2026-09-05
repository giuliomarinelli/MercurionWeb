import { Inject, Injectable, InjectionToken } from '@angular/core'

import {
  ChemistryAdapterError,
  ChemistryRendererAdapter,
  ChemistryRendererSession
} from './chemistry-adapter.models'
import { MoleculeProperties } from '../Models/graphql/molecule-properties.model'

export type ChemistryRendererAdapterLoader = () => Promise<{
  createRdKitRendererAdapter(): Promise<ChemistryRendererAdapter>
}>

export const CHEMISTRY_RENDERER_ADAPTER_LOADER =
  new InjectionToken<ChemistryRendererAdapterLoader>('CHEMISTRY_RENDERER_ADAPTER_LOADER', {
    providedIn: 'root',
    factory: () => () => import('./adapters/rdkit-renderer.adapter')
  })

@Injectable({ providedIn: 'root' })
export class ChemistryRendererService {
  private adapterPromise?: Promise<ChemistryRendererAdapter>
  private readonly initializationTimeoutMs = 15_000

  constructor(
    @Inject(CHEMISTRY_RENDERER_ADAPTER_LOADER)
    private readonly loadAdapterModule: ChemistryRendererAdapterLoader
  ) {}

  async createSession(): Promise<ChemistryRendererSession> {
    const adapter = await this.getAdapter()
    return adapter.createSession()
  }

  async toMolfile(structure: string): Promise<string | undefined> {
    return this.withSession(session => session.toMolfile(structure))
  }

  async getMoleculeProperties(structure: string): Promise<MoleculeProperties> {
    return this.withSession(session => session.getMoleculeProperties(structure))
  }

  private getAdapter(): Promise<ChemistryRendererAdapter> {
    if (!this.adapterPromise) {
      this.adapterPromise = this.withTimeout(
        this.loadAdapterModule().then(module => module.createRdKitRendererAdapter())
      ).catch(error => {
        this.adapterPromise = undefined
        if (error instanceof ChemistryAdapterError) throw error
        throw new ChemistryAdapterError('adapter-load-failed', 'Impossibile caricare il renderer molecolare.')
      })
    }

    return this.adapterPromise
  }

  private async withSession<T>(operation: (session: ChemistryRendererSession) => Promise<T>): Promise<T> {
    const session = await this.createSession()
    try {
      return await operation(session)
    } finally {
      session.dispose()
    }
  }

  private withTimeout<T>(operation: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new ChemistryAdapterError(
          'initialization-timeout',
          'Il renderer molecolare non ha risposto in tempo.'
        )),
        this.initializationTimeoutMs
      )

      operation.then(
        result => {
          clearTimeout(timeoutId)
          resolve(result)
        },
        error => {
          clearTimeout(timeoutId)
          reject(error)
        }
      )
    })
  }
}
