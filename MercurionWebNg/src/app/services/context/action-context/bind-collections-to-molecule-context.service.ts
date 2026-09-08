import { Injectable, computed, inject } from '@angular/core';
import { ActionOverlayContextService } from './action-overlay-context.service';

/**
 * Read-only view over the active `BindCollectionsToMolecule` session input.
 */
@Injectable({
  providedIn: 'root'
})
export class BindCollectionsToMoleculeContextService {

  private readonly overlay = inject(ActionOverlayContextService)

  readonly moleculeId = computed<string | null>(() =>
    this.overlay.session('BindCollectionsToMolecule')?.input.moleculeId ?? null
  )

}
