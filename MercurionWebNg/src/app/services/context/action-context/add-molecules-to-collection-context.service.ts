import { Injectable, computed, inject } from '@angular/core';
import { ActionOverlayContextService } from './action-overlay-context.service';

/**
 * Read-only view over the active `AddMoleculesToCollection` session input.
 * The overlay's session is the sole owner of this payload; there is no
 * settable root-singleton mailbox to leak state between openings.
 */
@Injectable({
  providedIn: 'root'
})
export class AddMoleculesToCollectionContextService {

  private readonly overlay = inject(ActionOverlayContextService)

  readonly collectionId = computed<string | null>(() =>
    this.overlay.session('AddMoleculesToCollection')?.input.collectionId ?? null
  )

  readonly redirectToCollectionPath = computed<boolean>(() =>
    this.overlay.session('AddMoleculesToCollection')?.input.redirectToCollectionPath ?? false
  )

  readonly importFromChembl = computed<boolean>(() =>
    this.overlay.session('AddMoleculesToCollection')?.input.importFromChembl ?? false
  )

}
