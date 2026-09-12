import {
  COLLECTION_NAME_MAX_LENGTH,
  addIdentity,
  addSelection,
  clearSelection,
  collectionNameCollision,
  hasSelection,
  normalizeCollectionName,
  removeSelection,
  removeIdentity,
  sameCollectionName,
  sameIdentity,
  validateCollectionName
} from './collection-rules';

describe('collection rules', () => {
  it('normalizes leading, trailing and repeated whitespace like the backend', () => {
    expect(normalizeCollectionName('  alpha\t \n beta  ')).toBe('alpha beta');
  });

  it('keeps case significant because backend uniqueness is case-sensitive', () => {
    expect(sameCollectionName('Alpha', ' alpha ')).toBe(false);
    expect(sameCollectionName(' Alpha  beta ', 'Alpha beta')).toBe(true);
  });

  it('returns typed empty and length validation results', () => {
    expect(validateCollectionName(' \t')).toEqual({
      ok: false,
      code: 'empty',
      normalized: '',
      message: 'Inserisci un nome per la collezione.'
    });

    const tooLong = validateCollectionName('x'.repeat(COLLECTION_NAME_MAX_LENGTH + 1));
    expect(tooLong.ok).toBeFalse();
    expect(tooLong.code).toBe('too_long');
    expect(tooLong.normalized.length).toBe(COLLECTION_NAME_MAX_LENGTH + 1);
  });

  it('detects normalized pending duplicates and existing-name collisions deterministically', () => {
    expect(collectionNameCollision(' alpha  beta ', {
      pendingNames: ['Alpha beta']
    })).toBeNull();
    expect(collectionNameCollision(' alpha  beta ', {
      pendingNames: ['alpha beta']
    })?.code).toBe('duplicate');
    expect(validateCollectionName('known', {
      existingCollections: [{ id: '1', name: ' known ' }]
    }).code).toBe('collision');
  });

  it('adds, removes and clears immutable identity selections without duplicates', () => {
    const first = { id: '1', name: 'one' };
    const second = { id: '2', name: 'two' };
    const original = [first];
    const withSecond = addSelection(original, second);
    const withDuplicate = addSelection(withSecond, { id: '2', name: 'updated' });

    expect(withSecond).toEqual([first, second]);
    expect(withDuplicate).toEqual(withSecond);
    expect(withSecond).not.toBe(original);
    expect(hasSelection(withSecond, '2')).toBeTrue();
    expect(sameIdentity(second, { id: '2' })).toBeTrue();
    expect(removeSelection(withSecond, '1')).toEqual([second]);
    expect(clearSelection(withSecond)).toEqual([]);
    expect(original).toEqual([first]);
    expect(addIdentity(['1'], '1')).toEqual(['1']);
    expect(addIdentity(['1'], '2')).toEqual(['1', '2']);
    expect(removeIdentity(['1', '2'], '1')).toEqual(['2']);
  });
});
