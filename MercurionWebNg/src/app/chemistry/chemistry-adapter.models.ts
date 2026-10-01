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

export interface ChemistryCapabilityState {
  status: ChemistryCapabilityStatus
  error?: ChemistryAdapterError
}

export const chemistryEditorModes = ['create', 'edit', 'duplicate'] as const
export type ChemistryEditorMode = typeof chemistryEditorModes[number]

export function isChemistryEditorMode(value: unknown): value is ChemistryEditorMode {
  return typeof value === 'string' && chemistryEditorModes.some(mode => mode === value)
}

export const chemistryEditorTabs = ['std', 'live'] as const
export type ChemistryEditorTab = typeof chemistryEditorTabs[number]

export function isChemistryEditorTab(value: unknown): value is ChemistryEditorTab {
  return typeof value === 'string' && chemistryEditorTabs.some(tab => tab === value)
}

export interface MoleculeEditorQp {
  mode: ChemistryEditorMode
  mId?: string
  smiles?: string
  tab?: ChemistryEditorTab
  destroyCache: 'true' | 'false'
}

export interface ChemistryEditorSession {
  readonly resourceUrl: string
  attach(frame: HTMLIFrameElement): void
  onStateChange(listener: (state: ChemistryCapabilityState) => void): () => void
  setStructure(structure: string): Promise<void>
  exportStructure(): Promise<string>
  dispose(): void
}
