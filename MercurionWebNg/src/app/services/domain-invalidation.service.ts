import { Injectable, signal } from '@angular/core';

export type DomainInvalidation =
  // Canonical state-sync invalidations.
  | { domain: 'molecule'; action: 'changed'; resourceId?: string; change?: 'created' | 'updated' | 'deleted' | 'content-changed'; remote?: boolean }
  | { domain: 'molecule-collection'; action: 'changed'; resourceId?: string; change?: 'created' | 'updated' | 'deleted' | 'content-changed'; remote?: boolean }
  | { domain: 'profile'; action: 'changed'; remote?: boolean }
  | { domain: 'account-security'; action: 'changed'; remote?: boolean }
  | { domain: 'sessions'; action: 'changed'; remote?: boolean }
  | { domain: 'ticket'; action: 'changed'; resourceId?: string; change?: 'created' | 'updated' | 'deleted' | 'content-changed'; remote?: boolean }
  | { domain: 'history'; action: 'changed'; remote?: boolean }
  | { domain: 'realtime'; action: 'reconcile'; remote: true }
  // Legacy local invalidations retained while producers migrate to the canonical vocabulary.
  | { domain: 'molecule-collection'; action: 'created' | 'deleted'; collectionId?: string }
  | { domain: 'molecule-collection'; action: 'molecules-added'; collectionId: string }
  | { domain: 'molecule-collection'; action: 'items-changed'; collectionId: string }
  | { domain: 'molecule'; action: 'collections-bound'; moleculeId: string }
  | { domain: 'dashboard'; action: 'profile-changed' }
  | { domain: 'ticket'; action: 'changed'; ticketId?: string; scope?: 'User' | 'Support' }

@Injectable({ providedIn: 'root' })
export class DomainInvalidationService {
  private readonly _last = signal<DomainInvalidation | null>(null);
  readonly last = this._last.asReadonly();

  publish(event: DomainInvalidation): void {
    this._last.set(event);
  }
}
