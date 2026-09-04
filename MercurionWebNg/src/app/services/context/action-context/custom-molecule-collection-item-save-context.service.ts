import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { KetcherFrameMode } from '../../../components/chem/ketcher-frame/ketcher-frame.component';
import { ActionOverlayContextService } from './action-overlay-context.service';

/**
 * `mode`/`smiles` are the immutable input captured when the `MoleculeCollectionItemSave`
 * session opened. `selectedCollectionId`/`searchTerm`/`page` are session-scoped UI
 * selection state: they are not caller input, but they must not survive a close/reopen
 * either, so they are reset automatically whenever the owning session changes instead
 * of relying on callers remembering to invoke a manual reset.
 */
@Injectable({
  providedIn: 'root'
})
export class CustomMoleculeCollectionItemSaveContextService {

  private readonly overlay = inject(ActionOverlayContextService)

  readonly mode = computed<KetcherFrameMode>(() =>
    this.overlay.session('MoleculeCollectionItemSave')?.input.mode ?? 'edit'
  )

  readonly smiles = computed<string>(() =>
    this.overlay.session('MoleculeCollectionItemSave')?.input.smiles ?? ''
  )

  selectedCollectionId = signal<string | null>(null)
  searchTerm = signal('')
  page = signal(1)

  private lastSessionId: number | undefined = undefined

  private readonly resetOnNewSession = effect(() => {
    const id = this.overlay.session('MoleculeCollectionItemSave')?.id
    if (id === this.lastSessionId) return
    this.lastSessionId = id
    this.selectedCollectionId.set(null)
    this.searchTerm.set('')
    this.page.set(1)
  })

}
