import { AuthProvider } from '@mercurion/rest-contracts'
import { ProfileDTO } from '../../../Models/account/account.models'

export function dashboardProfile(overrides: Partial<ProfileDTO> = {}): ProfileDTO {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    gender: 'F',
    job: null,
    obscuredAccountId: 'a***@example.test',
    accountIdKind: 'email',
    identityProvider: AuthProvider.Mercurion,
    obscuredPhone: null,
    avatarId: null,
    initials: 'AL',
    recentHistory: [],
    personalMoleculeCount: 2,
    chemblMoleculeCount: 3,
    collectionCount: 4,
    ...overrides,
  }
}
