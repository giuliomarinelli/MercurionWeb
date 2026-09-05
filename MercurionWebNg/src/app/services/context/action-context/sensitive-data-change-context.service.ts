import { Injectable, computed, inject } from '@angular/core';
import { ActionOverlayContextService } from './action-overlay-context.service';

/**
 * Read-only view over the active `SensitiveDataChange` session input.
 */
@Injectable({
  providedIn: 'root'
})
export class SensitiveDataChangeContextService {

  private readonly overlay = inject(ActionOverlayContextService)

  readonly innerScope = computed(() =>
    this.overlay.session('SensitiveDataChange')?.input.innerScope ?? ''
  )

}
