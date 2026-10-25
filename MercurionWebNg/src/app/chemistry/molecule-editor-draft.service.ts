import { computed, inject, Injectable, signal } from '@angular/core'

import {
  ChemistryEditorMode,
  ChemistryEditorTab,
  isChemistryEditorMode,
  isChemistryEditorTab
} from './chemistry-adapter.models'
import {
  BrowserStorageRegistry,
  StorageDescriptor,
  storageDescriptor
} from '../services/browser-storage-registry'
import type { MoleculeNameByCanonicalSmilesDTO } from '../services/graphql/molecule-name-by-canonical-smiles.dto'

const MAX_HISTORY_ENTRIES = 100

const EDIT_DRAFT = storageDescriptor<string>('mercurion.v1.molecule-editor-cache.edit')
const CREATE_DRAFT = storageDescriptor<string>('mercurion.v1.molecule-editor-cache.create')
const DUPLICATE_DRAFT = storageDescriptor<string>('mercurion.v1.molecule-editor-cache.duplicate')

export interface MoleculeEditorHistoryEntry {
  smiles: string
  tab: ChemistryEditorTab
}

export interface MoleculeEditorHistoryState {
  entries: MoleculeEditorHistoryEntry[]
  cursor: number
}

export interface MoleculeEditorDraftState {
  version: 1
  mode: ChemistryEditorMode
  mId?: string
  baselineSmiles: string
  currentTab: ChemistryEditorTab
  history: MoleculeEditorHistoryState
  identity?: MoleculeEditorCachedIdentity
}

export interface MoleculeEditorCachedIdentity {
  rawSmiles: string
  canonicalSmiles: string
  name?: MoleculeNameByCanonicalSmilesDTO
}

export interface MoleculeEditorDraftInit {
  mode: ChemistryEditorMode
  mId?: string
  baselineSmiles: string
  initialSmiles?: string
  tab: ChemistryEditorTab
  destroyExisting: boolean
}

@Injectable({ providedIn: 'root' })
export class MoleculeEditorDraftService {
  private readonly storage = inject(BrowserStorageRegistry)
  private readonly state = signal<MoleculeEditorDraftState | null>(null)

  readonly draft = this.state.asReadonly()

  readonly currentEntry = computed<MoleculeEditorHistoryEntry | null>(() => {
    const draft = this.state()
    if (!draft) return null
    return draft.history.entries[draft.history.cursor] ?? null
  })

  readonly currentSmiles = computed(() => this.currentEntry()?.smiles ?? '')
  readonly currentTab = computed<ChemistryEditorTab>(() => this.state()?.currentTab ?? 'std')
  readonly canUndo = computed(() => (this.state()?.history.cursor ?? 0) > 0)
  readonly canRedo = computed(() => {
    const draft = this.state()
    return !!draft && draft.history.cursor < draft.history.entries.length - 1
  })

  initialize(init: MoleculeEditorDraftInit): MoleculeEditorHistoryEntry {
    if (init.destroyExisting) {
      this.clearAll()
    }

    const restored = init.destroyExisting ? null : this.readDraft(init.mode)

    if (restored && this.matchesContext(restored, init)) {
      const normalized = this.normalizeDraft({
        ...restored,
        currentTab: init.tab
      })
      this.state.set(normalized)

      const current = normalized.history.entries[normalized.history.cursor]
      if (init.initialSmiles !== undefined && current.smiles !== init.initialSmiles) {
        const reconciled = this.record(init.initialSmiles, init.tab)
        if (reconciled) return reconciled
      }

      this.persist(normalized)
      return current
    }

    const initialSmiles = init.initialSmiles ?? init.baselineSmiles
    const draft: MoleculeEditorDraftState = {
      version: 1,
      mode: init.mode,
      ...(init.mode === 'edit' && init.mId ? { mId: init.mId } : {}),
      baselineSmiles: init.baselineSmiles,
      currentTab: init.tab,
      history: {
        entries: [{ smiles: initialSmiles, tab: init.tab }],
        cursor: 0
      }
    }

    this.state.set(draft)
    this.persist(draft)
    return draft.history.entries[0]
  }

  record(smiles: string, tab: ChemistryEditorTab = this.currentTab()): MoleculeEditorHistoryEntry | null {
    const draft = this.state()
    if (!draft) return null

    const current = draft.history.entries[draft.history.cursor]
    if (current?.smiles === smiles) {
      if (draft.currentTab !== tab) this.setTab(tab)
      return current
    }

    const entries = draft.history.entries.slice(0, draft.history.cursor + 1)
    entries.push({ smiles, tab })

    const cappedEntries = entries.length > MAX_HISTORY_ENTRIES
      ? entries.slice(entries.length - MAX_HISTORY_ENTRIES)
      : entries

    const next: MoleculeEditorDraftState = {
      ...draft,
      identity: this.getCachedIdentity(smiles),
      currentTab: tab,
      history: {
        entries: cappedEntries,
        cursor: cappedEntries.length - 1
      }
    }

    this.state.set(next)
    this.persist(next)
    return next.history.entries[next.history.cursor]
  }

  undo(): MoleculeEditorHistoryEntry | null {
    const draft = this.state()
    if (!draft || draft.history.cursor === 0) return null

    const next = {
      ...draft,
      history: {
        entries: draft.history.entries,
        cursor: draft.history.cursor - 1
      }
    }

    this.state.set(next)
    this.persist(next)
    return next.history.entries[next.history.cursor]
  }

  redo(): MoleculeEditorHistoryEntry | null {
    const draft = this.state()
    if (!draft || draft.history.cursor >= draft.history.entries.length - 1) return null

    const next = {
      ...draft,
      history: {
        entries: draft.history.entries,
        cursor: draft.history.cursor + 1
      }
    }

    this.state.set(next)
    this.persist(next)
    return next.history.entries[next.history.cursor]
  }

  resetToBaseline(tab: ChemistryEditorTab = this.currentTab()): MoleculeEditorHistoryEntry | null {
    const draft = this.state()
    if (!draft) return null
    return this.record(draft.baselineSmiles, tab)
  }

  setTab(tab: ChemistryEditorTab): void {
    const draft = this.state()
    if (!draft || draft.currentTab === tab) return

    const next = { ...draft, currentTab: tab }
    this.state.set(next)
    this.persist(next)
  }

  getCachedIdentity(smiles: string): MoleculeEditorCachedIdentity | undefined {
    const identity = this.state()?.identity
    return identity && this.matchesIdentity(identity, smiles) ? identity : undefined
  }

  cacheCanonicalSmiles(rawSmiles: string, canonicalSmiles: string): void {
    const draft = this.state()
    if (!draft || !canonicalSmiles.trim() || this.currentSmiles().trim() !== rawSmiles.trim()) return
    if (this.getCachedIdentity(rawSmiles)?.canonicalSmiles === canonicalSmiles) return
    const next = { ...draft, identity: { rawSmiles: rawSmiles.trim(), canonicalSmiles: canonicalSmiles.trim() } }
    this.state.set(next)
    this.persist(next)
  }

  cacheMoleculeName(canonicalSmiles: string, name: MoleculeNameByCanonicalSmilesDTO): void {
    const draft = this.state()
    const identity = this.getCachedIdentity(this.currentSmiles())
    if (!draft || !identity || identity.canonicalSmiles !== canonicalSmiles || !this.isCachedName(name)) return
    const next = { ...draft, identity: { ...identity, name: { name: name.name, type: name.type } } }
    this.state.set(next)
    this.persist(next)
  }

  clearCurrent(): void {
    const draft = this.state()
    if (!draft) return
    this.storage.remove(this.descriptorForMode(draft.mode))
    this.state.set(null)
  }

  acceptSavedBaseline(mId: string, canonicalSmiles: string): void {
    const draft = this.state()
    if (draft?.mode !== 'edit' || draft.mId !== mId) return
    const next = { ...draft, baselineSmiles: canonicalSmiles }
    this.state.set(next)
    this.persist(next)
  }

  clearAll(): void {
    this.storage.remove(EDIT_DRAFT)
    this.storage.remove(CREATE_DRAFT)
    this.storage.remove(DUPLICATE_DRAFT)
    this.state.set(null)
  }

  private matchesContext(draft: MoleculeEditorDraftState, init: MoleculeEditorDraftInit): boolean {
    if (draft.mode !== init.mode) return false
    if (draft.mode === 'edit') {
      return !!init.mId &&
        draft.mId === init.mId &&
        draft.baselineSmiles === init.baselineSmiles
    }
    if (draft.mode === 'duplicate') return draft.baselineSmiles === init.baselineSmiles
    return true
  }

  private persist(draft: MoleculeEditorDraftState): void {
    this.storage.set(this.descriptorForMode(draft.mode), JSON.stringify(draft))
  }

  private readDraft(mode: ChemistryEditorMode): MoleculeEditorDraftState | null {
    const descriptor = this.descriptorForMode(mode)
    const raw = this.storage.get(descriptor)
    if (!raw) return null

    try {
      const parsed: unknown = JSON.parse(raw)
      if (!this.isDraftState(parsed)) {
        this.storage.remove(descriptor)
        return null
      }
      return this.normalizeDraft(parsed)
    } catch {
      this.storage.remove(descriptor)
      return null
    }
  }

  private normalizeDraft(draft: MoleculeEditorDraftState): MoleculeEditorDraftState {
    const identity = this.isCachedIdentity(draft.identity) &&
      this.matchesIdentity(draft.identity, draft.history.entries[draft.history.cursor].smiles)
      ? draft.identity : undefined
    if (draft.history.entries.length <= MAX_HISTORY_ENTRIES) {
      return {
        ...draft,
        identity,
        history: {
          entries: [...draft.history.entries],
          cursor: draft.history.cursor
        }
      }
    }

    const start = Math.max(
      0,
      Math.min(
        draft.history.cursor - MAX_HISTORY_ENTRIES + 1,
        draft.history.entries.length - MAX_HISTORY_ENTRIES
      )
    )
    const entries = draft.history.entries.slice(start, start + MAX_HISTORY_ENTRIES)

    return {
      ...draft,
      identity,
      history: {
        entries,
        cursor: draft.history.cursor - start
      }
    }
  }

  private descriptorForMode(mode: ChemistryEditorMode): StorageDescriptor<string> {
    switch (mode) {
      case 'edit':
        return EDIT_DRAFT
      case 'create':
        return CREATE_DRAFT
      case 'duplicate':
        return DUPLICATE_DRAFT
    }
  }

  private isDraftState(value: unknown): value is MoleculeEditorDraftState {
    if (!this.isRecord(value)) return false
    if (value['version'] !== 1) return false
    if (!isChemistryEditorMode(value['mode'])) return false
    if (!isChemistryEditorTab(value['currentTab'])) return false
    if (typeof value['baselineSmiles'] !== 'string') return false

    if (value['mode'] === 'edit') {
      if (typeof value['mId'] !== 'string' || value['mId'].trim().length === 0) return false
    }

    const history = value['history']
    if (!this.isRecord(history)) return false

    const entries = history['entries']
    const cursor = history['cursor']

    if (!Array.isArray(entries) || entries.length === 0) return false
    if (typeof cursor !== 'number' || !Number.isInteger(cursor) || cursor < 0 || cursor >= entries.length) return false

    return entries.every(entry => this.isHistoryEntry(entry))
  }

  private isHistoryEntry(value: unknown): value is MoleculeEditorHistoryEntry {
    return this.isRecord(value) &&
      typeof value['smiles'] === 'string' &&
      isChemistryEditorTab(value['tab'])
  }

  private matchesIdentity(identity: MoleculeEditorCachedIdentity, smiles: string): boolean {
    const trimmed = smiles.trim()
    return !!trimmed && (identity.rawSmiles === trimmed || identity.canonicalSmiles === trimmed)
  }

  private isCachedIdentity(value: unknown): value is MoleculeEditorCachedIdentity {
    return this.isRecord(value) && typeof value['rawSmiles'] === 'string' && !!value['rawSmiles'].trim() &&
      typeof value['canonicalSmiles'] === 'string' && !!value['canonicalSmiles'].trim() &&
      (value['name'] === undefined || this.isCachedName(value['name']))
  }

  private isCachedName(value: unknown): value is MoleculeNameByCanonicalSmilesDTO {
    return this.isRecord(value) && (value['name'] === null || typeof value['name'] === 'string') &&
      ['chembl', 'custom', 'iupac'].includes(String(value['type']))
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }
}

export { MAX_HISTORY_ENTRIES }
