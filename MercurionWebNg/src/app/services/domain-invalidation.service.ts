import { Injectable, signal } from '@angular/core';

export type DomainInvalidation =
  | { domain: 'molecule-collection'; action: 'created' | 'deleted'; collectionId?: string }
  | { domain: 'molecule-collection'; action: 'molecules-added'; collectionId: string }
  | { domain: 'molecule'; action: 'collections-bound'; moleculeId: string }
  | { domain: 'dashboard'; action: 'profile-changed' }
  | { domain: 'ticket'; action: 'changed'; ticketId?: string; scope?: 'User' | 'Support' }
  | { domain: 'profile'; action: 'changed' };

@Injectable({ providedIn: 'root' })
export class DomainInvalidationService {
  private readonly _last = signal<DomainInvalidation | null>(null);
  readonly last = this._last.asReadonly();

  publish(event: DomainInvalidation): void {
    this._last.set(event);
  }
}
