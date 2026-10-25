import { TestBed } from '@angular/core/testing'

import {
  MAX_HISTORY_ENTRIES,
  MoleculeEditorDraftService
} from './molecule-editor-draft.service'

describe('MoleculeEditorDraftService', () => {
  let service: MoleculeEditorDraftService

  beforeEach(() => {
    sessionStorage.clear()
    TestBed.configureTestingModule({})
    service = TestBed.inject(MoleculeEditorDraftService)
    service.clearAll()
  })

  it('retains edits and their history when an earlier saved revision becomes the server baseline', () => {
    service.initialize({ mode: 'edit', mId: 'mol-a', baselineSmiles: 'CC', tab: 'std', destroyExisting: true })
    service.record('CCC')
    service.record('CCCC')
    service.acceptSavedBaseline('mol-b', 'WRONG')
    expect(service.draft()?.baselineSmiles).toBe('CC')
    service.acceptSavedBaseline('mol-a', 'CCC')
    expect(service.currentSmiles()).toBe('CCCC')
    expect(service.canUndo()).toBeTrue()
    const restored = service.initialize({ mode: 'edit', mId: 'mol-a', baselineSmiles: 'CCC', tab: 'std', destroyExisting: false })
    expect(restored.smiles).toBe('CCCC')
  })

  it('restores a persisted draft only for the same edit molecule and baseline', () => {
    service.initialize({
      mode: 'edit',
      mId: 'mol-a',
      baselineSmiles: 'CCO',
      tab: 'std',
      destroyExisting: true
    })
    service.record('CCN', 'std')

    const restored = service.initialize({
      mode: 'edit',
      mId: 'mol-a',
      baselineSmiles: 'CCO',
      tab: 'live',
      destroyExisting: false
    })

    expect(restored.smiles).toBe('CCN')
    expect(service.currentTab()).toBe('live')

    const differentMolecule = service.initialize({
      mode: 'edit',
      mId: 'mol-b',
      baselineSmiles: 'CCC',
      tab: 'std',
      destroyExisting: false
    })

    expect(differentMolecule.smiles).toBe('CCC')
    expect(service.draft()?.mId).toBe('mol-b')
  })

  it('uses an explicit route working snapshot to reconcile a stale cached current entry', () => {
    service.initialize({
      mode: 'create',
      baselineSmiles: '',
      tab: 'std',
      destroyExisting: true
    })
    service.record('STALE', 'std')

    const restored = service.initialize({
      mode: 'create',
      baselineSmiles: '',
      initialSmiles: 'CCO',
      tab: 'live',
      destroyExisting: false
    })

    expect(restored.smiles).toBe('CCO')
    expect(service.currentSmiles()).toBe('CCO')
    expect(service.currentTab()).toBe('live')
    expect(service.canUndo()).toBeTrue()
  })

  it('rejects a stale edit draft if the server baseline changed', () => {
    service.initialize({
      mode: 'edit',
      mId: 'mol-a',
      baselineSmiles: 'CCO',
      tab: 'std',
      destroyExisting: true
    })
    service.record('CCN', 'std')

    const restored = service.initialize({
      mode: 'edit',
      mId: 'mol-a',
      baselineSmiles: 'CCC',
      tab: 'std',
      destroyExisting: false
    })

    expect(restored.smiles).toBe('CCC')
    expect(service.draft()?.baselineSmiles).toBe('CCC')
    expect(service.canUndo()).toBeFalse()
  })

  it('supports undo and redo and truncates the redo branch after a new edit', () => {
    service.initialize({
      mode: 'create',
      baselineSmiles: '',
      tab: 'std',
      destroyExisting: true
    })

    service.record('C', 'std')
    service.record('CC', 'std')
    service.record('CCC', 'std')

    expect(service.undo()?.smiles).toBe('CC')
    expect(service.canRedo()).toBeTrue()

    service.record('CO', 'std')

    expect(service.currentSmiles()).toBe('CO')
    expect(service.canRedo()).toBeFalse()
    expect(service.draft()?.history.entries.map(entry => entry.smiles)).toEqual(['', 'C', 'CC', 'CO'])
  })

  it('treats reset as an undoable history operation', () => {
    service.initialize({
      mode: 'duplicate',
      baselineSmiles: 'c1ccccc1',
      tab: 'std',
      destroyExisting: true
    })
    service.record('Oc1ccccc1', 'std')

    expect(service.resetToBaseline()?.smiles).toBe('c1ccccc1')
    expect(service.canUndo()).toBeTrue()
    expect(service.undo()?.smiles).toBe('Oc1ccccc1')
  })

  it('caps history while preserving the current cursor', () => {
    service.initialize({
      mode: 'create',
      baselineSmiles: '',
      tab: 'std',
      destroyExisting: true
    })

    for (let i = 0; i < MAX_HISTORY_ENTRIES + 25; i += 1) {
      service.record(`C${i}`, 'std')
    }

    expect(service.draft()?.history.entries.length).toBe(MAX_HISTORY_ENTRIES)
    expect(service.draft()?.history.cursor).toBe(MAX_HISTORY_ENTRIES - 1)
    expect(service.currentSmiles()).toBe(`C${MAX_HISTORY_ENTRIES + 24}`)
  })

  it('keeps tab state independent from structural history', () => {
    service.initialize({
      mode: 'create',
      baselineSmiles: '',
      tab: 'std',
      destroyExisting: true
    })
    service.record('CCO', 'std')

    const historyLength = service.draft()?.history.entries.length
    service.setTab('live')
    service.record('CCO', 'live')

    expect(service.currentTab()).toBe('live')
    expect(service.draft()?.history.entries.length).toBe(historyLength)
    expect(service.currentSmiles()).toBe('CCO')
  })

  it('fails closed on malformed persisted state and replaces it with a valid draft', () => {
    sessionStorage.setItem('mercurion.v1.molecule-editor-cache.create', '{"version":1,"broken":true}')

    expect(() => service.initialize({
      mode: 'create',
      baselineSmiles: '',
      initialSmiles: 'CCO',
      tab: 'std',
      destroyExisting: false
    })).not.toThrow()

    expect(service.currentSmiles()).toBe('CCO')

    const persisted = sessionStorage.getItem('mercurion.v1.molecule-editor-cache.create')
    expect(persisted).not.toBeNull()
    expect(() => JSON.parse(persisted ?? '')).not.toThrow()
  })

  it('does not restore a duplicate draft for a different source structure', () => {
    service.initialize({
      mode: 'duplicate',
      baselineSmiles: 'CCO',
      tab: 'std',
      destroyExisting: true
    })
    service.record('CCN', 'std')

    const restored = service.initialize({
      mode: 'duplicate',
      baselineSmiles: 'CCC',
      tab: 'std',
      destroyExisting: false
    })

    expect(restored.smiles).toBe('CCC')
    expect(service.canUndo()).toBeFalse()
  })

  for (const name of ['Etanolo', null]) {
    it(`restores canonical identity and the resolved name ${name} from session storage in a new service`, () => {
      service.initialize({ mode: 'create', baselineSmiles: '', tab: 'std', destroyExisting: true })
      service.record('OCC')
      service.cacheCanonicalSmiles('OCC', 'CCO')
      service.cacheMoleculeName('CCO', { name, type: 'iupac' })
      const restored = TestBed.runInInjectionContext(() => new MoleculeEditorDraftService())
      restored.initialize({ mode: 'create', baselineSmiles: '', tab: 'live', destroyExisting: false })
      expect(restored.getCachedIdentity('OCC')).toEqual({ rawSmiles: 'OCC', canonicalSmiles: 'CCO', name: { name, type: 'iupac' } })
      expect(restored.getCachedIdentity('CCO')?.canonicalSmiles).toBe('CCO')
      expect(restored.getCachedIdentity('CCC')).toBeUndefined()
      restored.record('CCC')
      expect(restored.getCachedIdentity('OCC')).toBeUndefined()
      restored.cacheMoleculeName('CCO', { name: 'Late name', type: 'iupac' })
      restored.cacheCanonicalSmiles('OCC', 'CCO')
      expect(restored.getCachedIdentity('CCC')).toBeUndefined()
    })
  }

  it('drops malformed cached identity without losing a valid drawing or history', () => {
    service.initialize({ mode: 'create', baselineSmiles: '', tab: 'std', destroyExisting: true })
    service.record('CCO')
    sessionStorage.setItem('mercurion.v1.molecule-editor-cache.create', JSON.stringify({
      ...service.draft(), identity: { rawSmiles: 'CCO', canonicalSmiles: 42 }
    }))
    service.initialize({ mode: 'create', baselineSmiles: '', tab: 'live', destroyExisting: false })
    expect(service.currentSmiles()).toBe('CCO')
    expect(service.canUndo()).toBeTrue()
    expect(service.getCachedIdentity('CCO')).toBeUndefined()
  })

  it('does not reuse identity for another edit context or after clearing drafts', () => {
    service.initialize({ mode: 'edit', mId: 'a', baselineSmiles: 'CCO', tab: 'std', destroyExisting: true })
    service.cacheCanonicalSmiles('CCO', 'CCO')
    service.initialize({ mode: 'edit', mId: 'b', baselineSmiles: 'CCO', tab: 'std', destroyExisting: false })
    expect(service.getCachedIdentity('CCO')).toBeUndefined()
    service.cacheCanonicalSmiles('CCO', 'CCO')
    service.clearCurrent()
    expect(service.getCachedIdentity('CCO')).toBeUndefined()
  })
})
