import { TypeGuards } from './type-guards';

describe('TypeGuards', () => {
  it('recognizes discriminated molecule and auth payloads', () => {
    expect(TypeGuards.isChemblMolecule({ type: 'chembl' } as any)).toBe(true);
    expect(TypeGuards.isCustomMolecule({ type: 'custom' } as any)).toBe(true);
    expect(TypeGuards.isAuthProvider('Google')).toBe(true);
    expect(TypeGuards.isAuthProvider('unknown')).toBe(false);
  });

  it('accepts only the documented storage and MFA values', () => {
    expect(TypeGuards.isStorageAction('ChangeProfileImage')).toBe(true);
    expect(TypeGuards.isStorageAction('DeleteEverything')).toBe(false);
    expect(TypeGuards.isMfaStrategy(undefined)).toBe(false);
  });
});
