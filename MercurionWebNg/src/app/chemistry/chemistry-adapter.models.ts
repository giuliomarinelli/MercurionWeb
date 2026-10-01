import { MoleculeProperties } from '../Models/graphql/molecule-properties.model'
import { StorageDescriptor, storageDescriptor } from '../services/browser-storage-registry'

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

const chemistryEditorModes = ['create', 'edit', 'duplicate'] as const
export type ChemistryEditorMode = typeof chemistryEditorModes[number]
const chemistryEditorTabs = ['std', 'live'] as const
export type ChemistryEditorTab = typeof chemistryEditorTabs[number]

export interface MoleculeEditorCacheBaseItem {
  smiles: string
  tab: ChemistryEditorTab
}

export interface MoleculeEditorCacheItemOnEdit extends MoleculeEditorCacheBaseItem {
  mode: 'edit'
  mol: {
    id: string;
    canonicalSmiles: string;
    name: string | null;
    molFormula: string | null;
  }
  mId: string
}

export interface MoleculeEditorCacheItemOnCreate extends MoleculeEditorCacheBaseItem {
  mode: 'create'
}

export interface MoleculeEditorCacheItemOnDuplicate extends MoleculeEditorCacheBaseItem {
  mode: 'duplicate'
}

export type MoleculeEditorCache = (MoleculeEditorCacheItemOnEdit | MoleculeEditorCacheItemOnCreate | MoleculeEditorCacheItemOnDuplicate)[]

export const SESSION_STORAGE_MOLECULE_EDITOR_EDIT_CACHE_KEY: StorageDescriptor<string> = storageDescriptor<string>('mercurion.v1.molecule-editor-cache.edit')
export const SESSION_STORAGE_MOLECULE_EDITOR_CREATE_CACHE_KEY: StorageDescriptor<string> = storageDescriptor<string>('mercurion.v1.molecule-editor-cache.create')
export const SESSION_STORAGE_MOLECULE_EDITOR_DUPLICATE_CACHE_KEY: StorageDescriptor<string> = storageDescriptor<string>('mercurion.v1.molecule-editor-cache.duplicate')

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
