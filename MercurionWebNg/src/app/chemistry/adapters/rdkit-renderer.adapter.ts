import type { RDKitModule } from '@rdkit/rdkit'

import {
  ChemistryAdapterError,
  ChemistryRendererAdapter,
  ChemistryRendererSession,
  ChemistryRenderRequest
} from '../chemistry-adapter.models'
import { MoleculeProperties } from '../../Models/graphql/molecule-properties.model'

export interface RdKitMolecule {
  delete(): void
  get_descriptors(): string
  get_molblock(): string
  get_svg_with_highlights(options: string): string
  is_valid(): boolean
}

export interface RdKitApplicationModule {
  get_mol(structure: string, options?: string): RdKitMolecule | null
}

export class RdKitRendererSession implements ChemistryRendererSession {
  private disposed = false

  constructor(private readonly rdkit: RdKitApplicationModule) {}

  async renderSvg(request: ChemistryRenderRequest): Promise<string> {
    const mol = this.getValidMolecule(request.structure.split('$$$$')[0])

    try {
      return mol.get_svg_with_highlights(JSON.stringify({
        atomColourPalette: request.options.atomPalette,
        backgroundColour: request.options.background,
        bondLineColour: request.options.bond,
        bondLineWidth: 1.6,
        clearBackground: false,
        fixedBondLength: request.options.fixedBondLength,
        padding: 0.02
      }))
    } catch {
      throw new ChemistryAdapterError('operation-failed', 'Impossibile renderizzare la struttura molecolare.')
    } finally {
      mol.delete()
    }
  }

  async toMolfile(structure: string): Promise<string | undefined> {
    if (!structure.trim()) return undefined

    const mol = this.getValidMolecule(structure)
    try {
      return mol.get_molblock()
    } catch {
      throw new ChemistryAdapterError('operation-failed', 'Impossibile convertire la struttura molecolare.')
    } finally {
      mol.delete()
    }
  }

  async getMoleculeProperties(structure: string): Promise<MoleculeProperties> {
    const mol = this.getValidMolecule(structure, '{"sanitize":true,"removeHs":true}')

    try {
      const descriptors = JSON.parse(mol.get_descriptors()) as Record<string, unknown>
      const toNumber = (value: unknown): number | null => {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
      }

      return {
        mwFreebase: toNumber(descriptors['amw'] ?? descriptors['exactmw']),
        alogp: toNumber(descriptors['CrippenClogP']),
        hba: toNumber(descriptors['NumHBA']),
        hbd: toNumber(descriptors['NumHBD']),
        psa: toNumber(descriptors['tpsa']),
        rtb: toNumber(descriptors['NumRotatableBonds'])
      }
    } catch (error) {
      if (error instanceof ChemistryAdapterError) throw error
      throw new ChemistryAdapterError('operation-failed', 'Impossibile calcolare le proprietà molecolari.')
    } finally {
      mol.delete()
    }
  }

  dispose(): void {
    this.disposed = true
  }

  private getValidMolecule(structure: string, options?: string): RdKitMolecule {
    if (this.disposed) {
      throw new ChemistryAdapterError('unavailable', 'La sessione di rendering non è più disponibile.', false)
    }

    let mol: RdKitMolecule | null
    try {
      mol = options === undefined
        ? this.rdkit.get_mol(structure)
        : this.rdkit.get_mol(structure, options)
    } catch {
      throw new ChemistryAdapterError('invalid-structure', 'La struttura molecolare non è valida.')
    }

    if (!mol) {
      throw new ChemistryAdapterError('invalid-structure', 'La struttura molecolare non è valida.')
    }

    try {
      if (!mol.is_valid()) {
        throw new ChemistryAdapterError('invalid-structure', 'La struttura molecolare non è valida.')
      }
    } catch (error) {
      mol.delete()
      if (error instanceof ChemistryAdapterError) throw error
      throw new ChemistryAdapterError('invalid-structure', 'La struttura molecolare non è valida.')
    }

    return mol
  }
}

class RdKitRendererAdapter implements ChemistryRendererAdapter {
  constructor(private readonly rdkit: RdKitApplicationModule) {}

  createSession(): ChemistryRendererSession {
    return new RdKitRendererSession(this.rdkit)
  }
}

export async function createRdKitRendererAdapter(): Promise<ChemistryRendererAdapter> {
  try {
    const module = await import('@rdkit/rdkit')
    const rdkit = await (module.default as (options: {
      locateFile: () => string
    }) => Promise<RDKitModule | undefined>)({
      locateFile: () => '/RDKit_minimal.wasm'
    })

    if (!rdkit) {
      throw new ChemistryAdapterError('initialization-failed', 'RDKit non è disponibile.')
    }

    return new RdKitRendererAdapter(rdkit as unknown as RdKitApplicationModule)
  } catch (error) {
    if (error instanceof ChemistryAdapterError) throw error
    throw new ChemistryAdapterError('initialization-failed', 'Impossibile inizializzare il renderer molecolare.')
  }
}
