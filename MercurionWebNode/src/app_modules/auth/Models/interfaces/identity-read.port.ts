import { UUID } from 'crypto'
import { Scope } from 'src/app_modules/user/Models/enums/scope.enum'

export const IDENTITY_READ_PORT = Symbol('IDENTITY_READ_PORT')

export interface IdentityReadPort {
    getUserScopesById(userId: UUID): Promise<Scope[] | null>
}
