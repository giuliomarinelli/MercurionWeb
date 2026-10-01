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
      this.persist(normalized)
      return normalized.history.entries[normalized.history.cursor]
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

  clearCurrent(): void {
    const draft = this.state()
    if (!draft) return
    this.storage.remove(this.descriptorForMode(draft.mode))
    this.state.set(null)
  }

  clearAll(): void {
    this.storage.remove(EDIT_DRAFT)
    this.storage.remove(CREATE_DRAFT)
    this.storage.remove(DUPLICATE_DRAFT)
    this.state.set(null)
  }

  private matchesContext(draft: MoleculeEditorDraftState, init: MoleculeEditorDraftInit): boolean {
    if (draft.mode !== init.mode) return false
    if (draft.mode === 'edit') return !!init.mId && draft.mId === init.mId
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
    if (draft.history.entries.length <= MAX_HISTORY_ENTRIES) {
      return {
        ...draft,
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
    if (!Number.isInteger(cursor) || typeof cursor !== 'number' || cursor < 0 || cursor >= entries.length) return false

    return entries.every(entry => this.isHistoryEntry(entry))
  }

  private isHistoryEntry(value: unknown): value is MoleculeEditorHistoryEntry {
    return this.isRecord(value) &&
      typeof value['smiles'] === 'string' &&
      isChemistryEditorTab(value['tab'])
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }
}

export { MAX_HISTORY_ENTRIES }
