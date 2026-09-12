import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';

/**
 * The API normalizes collection names with trim() and whitespace collapsing,
 * then caps the persisted value at 255 characters while resolving collisions
 * with a numeric suffix. The client applies the same normalization before
 * validating pending names; the server remains authoritative for races.
 */
export const COLLECTION_NAME_MAX_LENGTH = 255;

export type CollectionNameValidationCode =
  | 'valid'
  | 'empty'
  | 'too_long'
  | 'duplicate'
  | 'collision';

export interface CollectionNameValidationResult {
  readonly ok: boolean;
  readonly code: CollectionNameValidationCode;
  readonly normalized: string;
  readonly message: string | null;
}

export interface CollectionNameValidationOptions {
  readonly pendingNames?: readonly string[];
  readonly existingCollections?: readonly Pick<MoleculeCollection, 'id' | 'name'>[];
}

const COLLECTION_NAME_MESSAGES: Record<Exclude<CollectionNameValidationCode, 'valid'>, string> = {
  empty: 'Inserisci un nome per la collezione.',
  too_long: `Il nome della collezione non può superare ${COLLECTION_NAME_MAX_LENGTH} caratteri.`,
  duplicate: 'Questo nome è già presente tra le collezioni da creare.',
  collision: 'Esiste già una collezione con questo nome.'
};

/** Matches the backend rule without changing case, which remains significant there. */
export function normalizeCollectionName(value: string | null | undefined): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

/**
 * Collection names compare after whitespace normalization. Case is preserved
 * deliberately because the backend uses the persisted name for uniqueness.
 */
export function sameCollectionName(left: string | null | undefined, right: string | null | undefined): boolean {
  return normalizeCollectionName(left) === normalizeCollectionName(right);
}

export function collectionNameCollision(
  name: string,
  options: CollectionNameValidationOptions = {}
): Pick<CollectionNameValidationResult, 'code' | 'message'> | null {
  const normalized = normalizeCollectionName(name);
  if (options.pendingNames?.some(candidate => sameCollectionName(candidate, normalized))) {
    return { code: 'duplicate', message: COLLECTION_NAME_MESSAGES.duplicate };
  }
  if (options.existingCollections?.some(collection => sameCollectionName(collection.name, normalized))) {
    return { code: 'collision', message: COLLECTION_NAME_MESSAGES.collision };
  }
  return null;
}

export function validateCollectionName(
  name: string | null | undefined,
  options: CollectionNameValidationOptions = {}
): CollectionNameValidationResult {
  const normalized = normalizeCollectionName(name);
  if (!normalized) {
    return { ok: false, code: 'empty', normalized, message: COLLECTION_NAME_MESSAGES.empty };
  }
  if (normalized.length > COLLECTION_NAME_MAX_LENGTH) {
    return {
      ok: false,
      code: 'too_long',
      normalized,
      message: COLLECTION_NAME_MESSAGES.too_long
    };
  }
  const collision = collectionNameCollision(normalized, options);
  if (collision) {
    return { ok: false, code: collision.code, normalized, message: collision.message };
  }
  return { ok: true, code: 'valid', normalized, message: null };
}

export interface Identifiable {
  readonly id: string;
}

export function sameIdentity(left: Identifiable | null | undefined, right: Identifiable | null | undefined): boolean {
  return Boolean(left?.id) && left?.id === right?.id;
}

export function addSelection<T extends Identifiable>(items: readonly T[], item: T): T[] {
  return items.some(existing => sameIdentity(existing, item)) ? [...items] : [...items, item];
}

export function removeSelection<T extends Identifiable>(items: readonly T[], id: string): T[] {
  return items.filter(item => item.id !== id);
}

export function clearSelection<T>(items: readonly T[]): T[] {
  return [];
}

export function hasSelection<T extends Identifiable>(items: readonly T[], id: string): boolean {
  return items.some(item => item.id === id);
}

export function addIdentity(ids: readonly string[], id: string): string[] {
  return id && !ids.includes(id) ? [...ids, id] : [...ids];
}

export function removeIdentity(ids: readonly string[], id: string): string[] {
  return ids.filter(existingId => existingId !== id);
}
