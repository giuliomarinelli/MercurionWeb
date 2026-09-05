import { MoleculeProperties } from '../Models/graphql/molecule-properties.model'

export type ChemistryErrorCode =
  | 'adapter-load-failed'
  | 'initialization-failed'
  | 'initialization-timeout'
  | 'invalid-structure'
  | 'operation-failed'
  | 'unavailable'

export class ChemistryAdapterError extends Error {
  constructor(
    readonly code: ChemistryErrorCode,
    message: string,
    readonly recoverable = true
  ) {
    super(message)
    this.name = 'ChemistryAdapterError'
  }
}

export interface ChemistryRenderRequest {
  structure: string
  options: {
    background: [number, number, number]
    bond: [number, number, number]
    atomPalette: Record<number, [number, number, number]>
    fixedBondLength: number
  }
}

export interface ChemistryRendererSession {
  renderSvg(request: ChemistryRenderRequest): Promise<string>
  toMolfile(structure: string): Promise<string | undefined>
  getMoleculeProperties(structure: string): Promise<MoleculeProperties>
  dispose(): void
}

export interface ChemistryRendererAdapter {
  createSession(): ChemistryRendererSession
}

export type ChemistryCapabilityStatus = 'loading' | 'ready' | 'unavailable'
export type ChemistryEditorMode = 'create' | 'edit' | 'duplicate'

export interface ChemistryCapabilityState {
  status: ChemistryCapabilityStatus
  error?: ChemistryAdapterError
}

export interface ChemistryEditorSession {
  readonly resourceUrl: string
  attach(frame: HTMLIFrameElement): void
  onStateChange(listener: (state: ChemistryCapabilityState) => void): () => void
  setStructure(structure: string): Promise<void>
  exportStructure(): Promise<string>
  dispose(): void
}
