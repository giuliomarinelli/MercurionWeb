import { MoleculeCollection } from 'src/app_modules/molecule-collection/models/entities/molecule-collection.entity';
import { ProfileRegistryClientDTO, ProfileRegistryDTO as ProfileRegistryDTO } from './../../auth/models/dto/profile.dtos';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../models/entities/user.entity';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';

import { UUID } from 'crypto';
import { nullish } from 'src/models/nullish.type';
import { MfaStrategy } from '../models/enums/mfa-strategy.enum';
import { IAuth } from 'src/app_modules/auth/models/interfaces/i-auth.interface';
import { PasswordEncoderService } from 'src/app_modules/auth/services/password-encoder.service';
import { OldPasswordItem } from '../models/dto/old-password-item.interface';
import { ProfileDTO } from 'src/app_modules/auth/models/dto/profile.dtos';
import { SecurityService } from 'src/app_modules/auth/services/security.service';
import { CompareResult } from 'src/app_modules/auth/models/enums/compare-result.enum';
import { LoggerPort } from 'src/logging/logger.port';
import { LoggerContext } from 'src/logging/logger.port';
import { Scope } from '../models/enums/scope.enum';
import { MoleculeCollectionItemEntity } from 'src/app_modules/molecule-collection/models/entities/molecule-collection-item.entity';
import { HistoryService } from 'src/app_modules/history/services/history.service';
import { TinyHistoryDTO } from 'src/app_modules/history/models/dto/history.dto';
import { AuthIdentity } from 'src/app_modules/sso/models/entities/auth-identity.entity';
import { ProvidedEmailDTO } from 'src/app_modules/auth/models/dto/provided-email.dto';
import { AuthProvider } from 'src/app_modules/sso/models/enums/auth-provider.enum';
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import type { IdentityReadPort } from 'src/app_modules/auth/models/interfaces/identity-read.port'
import { runInTransaction, transactionManager, type TransactionContext } from 'src/persistence/transaction-context'
import { LOCAL_DUMMY_AUTH } from '@mercurion/rest-contracts'
import { UserGender } from '../models/enums/user-gender.enum'

interface UserCreateCommand {
    email?: string
    unconfirmedEmail?: string
    passwordHash?: string
    firstName: string
    lastName: string
    initials: string
    job?: string | null
    gender: UserGender
    scopes: string[]
    otpSecret?: string
    registrationIdentity?: string
}

interface UserUpdateCommand {
    firstName?: string
    lastName?: string
    initials?: string
    email?: string | null
    unconfirmedEmail?: string | null
    completePhoneNumber?: string | null
    phoneNumberPrefixLength?: number
    unconfirmedPhoneNumber?: string | null
    unconfirmedPhoneNumberPrefixLength?: number | null
    updatedAt?: number
    mfaStrategies?: string
    appTotpSecret?: string | null
}

type UserPersistencePatch = {
    firstName?: string
    lastName?: string
    initials?: string
    email?: string | null
    unconfirmedEmail?: string | null
    completePhoneNumber?: string | null
    phoneNumberPrefixLength?: number
    unconfirmedPhoneNumber?: string | null
    unconfirmedPhoneNumberPrefixLength?: number | null
    updatedAt?: number
    mfaStrategies?: string
    appTotpSecret?: string | null
}

function toUserPatch(input: UserUpdateCommand): UserPersistencePatch {
    const patch: UserPersistencePatch = {}
    if (input.firstName !== undefined) patch.firstName = input.firstName
    if (input.lastName !== undefined) patch.lastName = input.lastName
    if (input.initials !== undefined) patch.initials = input.initials
    if (input.email !== undefined) patch.email = input.email
    if (input.unconfirmedEmail !== undefined) patch.unconfirmedEmail = input.unconfirmedEmail
    if (input.completePhoneNumber !== undefined) patch.completePhoneNumber = input.completePhoneNumber
    if (input.phoneNumberPrefixLength !== undefined) patch.phoneNumberPrefixLength = input.phoneNumberPrefixLength
    if (input.unconfirmedPhoneNumber !== undefined) patch.unconfirmedPhoneNumber = input.unconfirmedPhoneNumber
    if (input.unconfirmedPhoneNumberPrefixLength !== undefined) {
        patch.unconfirmedPhoneNumberPrefixLength = input.unconfirmedPhoneNumberPrefixLength
    }
    if (input.updatedAt !== undefined) patch.updatedAt = input.updatedAt
    if (input.mfaStrategies !== undefined) patch.mfaStrategies = input.mfaStrategies
    if (input.appTotpSecret !== undefined) patch.appTotpSecret = input.appTotpSecret
    return patch
}



@Injectable()
export class UserService implements IdentityReadPort {

    private readonly logger: LoggerContext
    private readonly mfaStrategyVals = Object.values(MfaStrategy)

    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        private readonly dataSource: DataSource,
        private readonly passwordEncoder: PasswordEncoderService,
        private readonly securityService: SecurityService,
        private readonly historyService: HistoryService,
        meiliLogger: LoggerPort
    ) {
        this.logger = meiliLogger.forContext(UserService.name)
    }

    public async getUserScopesById(userId: UUID): Promise<Scope[] | null> {
        try {
            const user = await this.userRepository
                .createQueryBuilder("user")
                .select(["user.scopes"])
                .where("user.id = :userId", { userId })
                .getOne()
            if (!user) {
                return null
            }
            return user.scopes
                .map((encryptedScope) => this.securityService.decrypt_AES256(encryptedScope))
                .filter((scope): scope is Scope => Object.values(Scope).includes(scope as Scope))
        } catch (e) {
            this.logger.warn(`Error in getScopesById, userId=${userId}`, e as object)
            return null
        }
    }

    public async createUser(userProps: UserCreateCommand): Promise<User> {
        try {
            return await runInTransaction(this.dataSource, async (_context, manager) => {
                const user = manager.create(User, {
                    email: userProps.email ?? undefined,
                    unconfirmedEmail: userProps.unconfirmedEmail ?? undefined,
                    passwordHash: userProps.passwordHash ?? undefined,
                    firstName: userProps.firstName,
                    lastName: userProps.lastName,
                    initials: userProps.initials,
                    job: userProps.job ?? undefined,
                    gender: userProps.gender,
                    scopes: userProps.scopes,
                    otpSecret: userProps.otpSecret ?? undefined,
                    registrationIdentity: userProps.registrationIdentity ?? undefined
                })
                return manager.save(user)
            })
        } catch (e) {
            this.logger.warn('Error creating new User: ', e as object)
            throw e
        }
    }

    public async createRegistration(
        userProps: UserCreateCommand,
        context: TransactionContext
    ): Promise<User> {
        const manager = transactionManager(context)
        return manager.save(manager.create(User, {
            email: userProps.email ?? undefined,
            unconfirmedEmail: userProps.unconfirmedEmail ?? undefined,
            passwordHash: userProps.passwordHash ?? undefined,
            firstName: userProps.firstName,
            lastName: userProps.lastName,
            initials: userProps.initials,
            job: userProps.job ?? undefined,
            gender: userProps.gender,
            scopes: userProps.scopes,
            otpSecret: userProps.otpSecret ?? undefined,
            registrationIdentity: userProps.registrationIdentity ?? undefined
        }))
    }

    public async activateAccount(
        id: UUID,
        accountRecoveryCodeHash: string,
        context: TransactionContext
    ): Promise<{ email: string, alreadyActivated: boolean }> {
        const manager = transactionManager(context)
        const user = await manager.findOne(User, {
            where: { id },
            lock: { mode: 'pessimistic_write' }
        })
        if (!user) {
            throw applicationError(ApplicationErrorCode.ACCOUNT_ACTIVATION_USER_NOT_FOUND)
        }
        if (user.isVerified && user.email) {
            return { email: user.email, alreadyActivated: true }
        }
        const email = user.unconfirmedEmail!
        await manager.update(User, { id }, {
            email,
            unconfirmedEmail: null,
            registrationIdentity: null,
            isVerified: true,
            updatedAt: Date.now(),
            accountRecoveryCodeHash
        })
        return { email, alreadyActivated: false }
    }

    public async createSsoUser(
        input: Pick<User, 'id' | 'firstName' | 'lastName' | 'initials' | 'scopes'>,
        context: TransactionContext
    ): Promise<{ id: UUID }> {
        const manager = transactionManager(context)
        const user = manager.create(User, {
            id: input.id,
            firstName: input.firstName,
            lastName: input.lastName,
            initials: input.initials,
            scopes: input.scopes,
            sso: true,
            isVerified: true
        })
        const persisted = await manager.save(user)
        return { id: persisted.id }
    }

    public async ensureLocalDevelopmentUser(scopes: string[]): Promise<void> {
        const id = LOCAL_DUMMY_AUTH.userId as UUID
        if (await this.userRepository.exists({ where: { id } })) return
        const now = Date.now()
        await this.userRepository.createQueryBuilder()
            .insert()
            .into(User)
            .values({
                id,
                email: LOCAL_DUMMY_AUTH.email,
                unconfirmedEmail: null,
                completePhoneNumber: null,
                phoneNumberPrefixLength: 0,
                unconfirmedPhoneNumber: null,
                unconfirmedPhoneNumberPrefixLength: null,
                passwordHash: null,
                firstName: LOCAL_DUMMY_AUTH.firstName,
                lastName: LOCAL_DUMMY_AUTH.lastName,
                gender: UserGender.Undefined,
                job: 'Local development fixture',
                initials: LOCAL_DUMMY_AUTH.initials,
                isVerified: true,
                scopes,
                mfaStrategies: '[]',
                createdAt: now,
                updatedAt: now,
                otpSecret: '',
                appTotpSecret: null,
                oldPasswordHashes: [],
                avatarId: null,
                backupCodesGiven: false,
                accountRecoveryCodeHash: null,
                locked: false,
                recoveryMode: false,
                sso: false
            })
            .orIgnore()
            .callListeners(false)
            .execute()
    }

    public async existsUserById(id: UUID): Promise<boolean> {
        return this.userRepository.exists({ where: { id } })
    }

    public async existsUserByEmail(email: string): Promise<boolean> {
        return this.userRepository.exists({ where: { email, sso: false } })
    }

    public async getUserFullNames(ids: readonly UUID[]): Promise<Map<string, string>> {
        if (ids.length === 0) return new Map()
        const users = await this.userRepository.find({
            where: { id: In([...ids]) },
            select: ['id', 'firstName', 'lastName']
        })
        return new Map(users.map((user) => [
            String(user.id),
            `${user.firstName} ${user.lastName}`.trim()
        ]))
    }

    public async getUserById(id: UUID, isVerified?: boolean): Promise<User | nullish> {
        const where: FindOptionsWhere<User> = { id }
        if (isVerified != undefined) {
            where.isVerified = isVerified
        }
        return this.userRepository.findOne({ where })
    }

    public async updateUser(id: UUID, userProps: UserUpdateCommand, context?: TransactionContext): Promise<User | nullish> {
        return runInTransaction(this.dataSource, async (_context, manager) => {
            const updateResult = await manager.update<User>(User, { id }, toUserPatch(userProps))
            if (updateResult.affected === 0) {
                return null
            }

            const updatedUser = await manager.findOne(User, { where: { id } })
            if (!updatedUser) {
                throw new Error(`User ${id} disappeared during transactional update read-back`)
            }
            return updatedUser
        }, context)
    }

    public async getUserEncryptedEnabledMfaStrategies(id: UUID): Promise<string[]> {

        const user = await this.userRepository.createQueryBuilder('u')
            .select(['u.mfaStrategies', 'u.sso'])
            .where('u.id = :id', { id })
            .getOne()

        if (!user) {
            throw applicationError(ApplicationErrorCode.MFA_SETTINGS_USER_NOT_FOUND)
        }

        if (user.sso || !user.mfaStrategies) {
            return []
        }

        return (JSON.parse(user.mfaStrategies) as string[])
            .filter(Boolean)
            .filter((s) => this.mfaStrategyVals.includes(this.securityService.decrypt_AES256(s) as MfaStrategy))

    }

    public async deleteUser(id: UUID): Promise<void> {
        await this.userRepository.delete(id)
    }

    public async getVerifiedUserByEmail(email: string): Promise<User | nullish> {
        return await this.userRepository.findOne({ where: { email, isVerified: true, sso: false } })
    }

    public async existsVerifiedUserByEmail(email: string): Promise<boolean> {
        return await this.userRepository.exists({
            where: {
                email,
                isVerified: true,
                sso: false
            }
        })
    }

    public async getVerifiedUserPasswordHashById(userId: UUID): Promise<string> | never {
        try {
            const { passwordHash } = await this.userRepository.createQueryBuilder('u')
                .select(['u.passwordHash'])
                .where('u.id = :userId', { userId })
                .andWhere('u.isVerified = true')
                .andWhere('u.sso = false')
                .andWhere('u.password_hash IS NOT NULL')
                .getOneOrFail()
            return passwordHash!
        } catch {
            throw applicationError(ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED_SOFT)
        }
    }

    public async getVerifiedUserAuthByEmail(email: string): Promise<IAuth | nullish> {
        const user = await this.userRepository.createQueryBuilder('u')
            .select(['u.id', 'u.passwordHash', 'u.locked'])
            .where('u.isVerified = true')
            .andWhere('u.sso = false')
            .andWhere('u.email = :email', { email })
            .getOne()
        if (!user || !user.passwordHash) {
            return null
        }
        const { id: userId, passwordHash, locked } = user
        return {
            userId,
            passwordHash,
            locked
        }
    }

    public async getOtpSecretByUserId(id: UUID): Promise<string | nullish> {
        const user = await this.userRepository.createQueryBuilder('u')
            .select('u.otpSecret')
            .where('u.id = :id', { id })
            .andWhere('u.sso = false')
            .getOne()
        if (!user) return user
        return user.otpSecret
    }

    public async getAppTotpSecretByUserId(id: UUID): Promise<string | nullish> {
        const user = await this.userRepository.createQueryBuilder('u')
            .select('u.appTotpSecret')
            .where('u.id = :id', { id })
            .andWhere('u.sso = false')
            .getOne()
        if (!user) return user
        return user.appTotpSecret
    }

    public async getUserFirstNameById(id: UUID): Promise<string | nullish> {
        const user = await this.userRepository.createQueryBuilder('u')
            .select('u.firstName')
            .where('u.id = :id', { id })
            .getOne()
        if (!user) return user
        return user.firstName
    }

    public async getVerifiedUserFirstNameById(id: UUID): Promise<string | nullish> {
        const user = await this.userRepository.createQueryBuilder('u')
            .select('u.firstName')
            .where('u.id = :id', { id })
            .andWhere('u.isVerified =  true')
            .getOne()
        if (!user) return user
        return user.firstName
    }

    public async getUserProvidedEmailById(id: UUID): Promise<ProvidedEmailDTO | null> {
        const userRow = await this.userRepository.createQueryBuilder('u')
            .select(['u.email', 'u.sso'])
            .where('u.id = :id', { id })
            .leftJoin("u.authIdentities", "a")
            .addSelect(["a.email", "a.provider"])
            .getOne()
        if (!userRow) {
            return null
        }
        if (userRow.sso) {
            return {
                email: userRow.authIdentities[0]?.email ?? '',
                provider: userRow.authIdentities[0]?.provider ?? ''
            }
        }
        return {
            email: userRow.email ?? '',
            provider: AuthProvider.Mercurion
        }
    }

    public async getPhoneNumberById(id: UUID): Promise<string | nullish> {
        const userRow = await this.userRepository.createQueryBuilder('u')
            .select(['u.completePhoneNumber', 'u.sso'])
            .where('u.id = :id', { id })
            .getOne()
        if (!userRow) {
            return null
        }
        if (userRow.sso) {
            throw applicationError(ApplicationErrorCode.UNPROCESSABLE_ENTITY)
        }
        return userRow.completePhoneNumber
    }

    public async appendMfaStrategy(id: UUID, strategy: MfaStrategy): Promise<void> {
        const currentStrategies: MfaStrategy[] = (await this.getUserEncryptedEnabledMfaStrategies(id))
            .map((s) => this.securityService.decrypt_AES256(s) as MfaStrategy)
            .filter((s) => this.mfaStrategyVals.includes(s))
        const updatedStrategies = Array.from(new Set([...currentStrategies, strategy]))
            .map((s) => this.securityService.encrypt_AES256(s))
        const mfaStrategies = JSON.stringify(updatedStrategies)
        const updatedUser = await this.updateUser(id, { mfaStrategies })
        if (!updatedUser) {
            throw applicationError(ApplicationErrorCode.MFA_SETTINGS_USER_NOT_FOUND)
        }
    }

    public async removeMfaStrategy(id: UUID, strategy: MfaStrategy): Promise<void> {
        const currentStrategies: MfaStrategy[] = (await this.getUserEncryptedEnabledMfaStrategies(id))
            .map((s) => this.securityService.decrypt_AES256(s) as MfaStrategy)
            .filter((s) => this.mfaStrategyVals.includes(s))
        const updated = currentStrategies.filter(s => s !== strategy)
            .map((s) => this.securityService.encrypt_AES256(s))
        const userProps: UserUpdateCommand = {
            mfaStrategies: JSON.stringify(updated)
        }
        if (strategy === MfaStrategy.APP_TOTP) {
            userProps.appTotpSecret = null
        }
        const updatedUser = await this.updateUser(id, userProps)
        if (!updatedUser) {
            throw applicationError(ApplicationErrorCode.MFA_SETTINGS_USER_NOT_FOUND)
        }
    }

    public async getUserInitialsByUserId(id: UUID): Promise<string | nullish> {
        const result = await this.userRepository.createQueryBuilder('u')
            .select(['u.initials'])
            .where('id = :id', { id })
            .getOne()
        if (!result) {
            return null
        }
        return result.initials
    }

    public async getUserIdByEmail(email: string): Promise<string | nullish> {
        const result = await this.userRepository.createQueryBuilder('u')
            .select(['u.id'])
            .where('u.email = :email', { email })
            .andWhere('u.sso = false')
            .getOne()
        if (!result) {
            return null
        }
        return result.id
    }

    public async changePassword(userId: UUID, newPassword: string, context?: TransactionContext): Promise<void> | never {
        await runInTransaction(this.userRepository.manager, async (_context, manager) => {
            let user: User
            try {
                user = await manager
                    .createQueryBuilder(User, 'u')
                    .select(['u.id', 'u.passwordHash', 'u.oldPasswordHashes'])
                    .where('u.id = :userId', { userId })
                    .andWhere('u.isVerified = true')
                    .andWhere('u.sso = false')
                    .andWhere('u.password_hash IS NOT NULL')
                    .setLock('pessimistic_write')
                    .getOneOrFail()
            } catch {
                throw applicationError(ApplicationErrorCode.UNPROCESSABLE_ENTITY)
            }

            const oldList: OldPasswordItem[] = Array.isArray(user.oldPasswordHashes)
                ? user.oldPasswordHashes
                : []

            const candidates = [
                user.passwordHash!,
                ...oldList.map(i => i.passwordHash),
            ].filter(Boolean)

            for (const h of candidates) {
                const res = await this.passwordEncoder.compareWithFallback(newPassword, h, true)
                if (res !== CompareResult.NoMatch) {
                    throw applicationError(ApplicationErrorCode.PASSWORD_REUSED)
                }
            }

            const newHash = await this.passwordEncoder.encode(newPassword)

            const nextOld: OldPasswordItem[] = [
                {
                    passwordHash: user.passwordHash!,
                    changedAt: Date.now()
                },
                ...oldList,
            ].filter(i => !!i?.passwordHash).slice(0, 50) // cap hard per evitare crescita incontrollata

            await manager
                .createQueryBuilder()
                .update(User)
                .set({
                    passwordHash: newHash,
                    oldPasswordHashes: nextOld,
                })
                .where('id = :userId', { userId })
                .execute()
        }, context)
    }

    public async getVerifiedUserProfileById(id: UUID, getRecentHistory = true): Promise<ProfileDTO | null> {

        try {
            return runInTransaction(this.dataSource, async (context, manager) => {

                const profileRow = await manager.findOne(User, {
                    where: { id, isVerified: true },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        gender: true,
                        job: true,
                        email: true,
                        completePhoneNumber: true,
                        avatarId: true,
                        sso: true,
                        initials: true
                    }
                })

                if (!profileRow) {
                    return null
                }

                const { firstName, lastName, gender, job, completePhoneNumber, avatarId, initials } = profileRow

                let _email: string | null = null
                let authIdentityRow: AuthIdentity | null

                if (profileRow.sso) {
                    authIdentityRow = await manager.findOne(AuthIdentity, {
                        where: {
                            userId: id
                        },
                        select: {
                            email: true
                        }
                    })
                    if (!authIdentityRow) {
                        return null
                    }
                    _email = authIdentityRow.email
                } else {
                    _email = profileRow.email
                }

                const personalMoleculeCount = await manager.count(MoleculeCollectionItemEntity, {
                    where: {
                        type: 'custom',
                        userId: id
                    }
                })

                const chemblMoleculeCount = await manager.count(MoleculeCollectionItemEntity, {
                    where: {
                        type: 'chembl',
                        userId: id
                    }
                })

                const collectionCount = await manager.count(MoleculeCollection, {
                    where: {
                        userId: id
                    }
                })

                let recentHistory: TinyHistoryDTO[] = []

                if (getRecentHistory) {
                    recentHistory = await this.historyService.getRecentHistoryTinyDistinctPerDay(id, 7, context)
                }

                const result: ProfileDTO = {
                    firstName,
                    lastName,
                    gender,
                    job,
                    obscuredEmail: this.securityService.maskEmail(_email ?? ''),
                    obscuredPhone: completePhoneNumber ? this.securityService.maskPhone(completePhoneNumber) : null,
                    avatarId,
                    recentHistory,
                    personalMoleculeCount,
                    chemblMoleculeCount,
                    collectionCount,
                    initials
                }

                return result
            })
        } catch (e) {
            this.logger.warn('Failed to fetch profile', e as object)
            throw e
        }
    }

    public async getVerifiedUserEssentialProfileRegistryById(id: UUID): Promise<ProfileRegistryClientDTO> {
        const row = await this.userRepository.findOne({
            where: {
                id,
                isVerified: true
            },
            select: {
                firstName: true,
                lastName: true,
                gender: true,
                job: true,
                initials: true
            }
        })
        if (!row) {
            throw applicationError(ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED)
        }
        const { firstName, lastName, gender, job, initials } = row
        return {
            firstName,
            lastName,
            gender,
            job: job ?? '',
            initials
        }
    }

    public async updateVerifiedUserProfileRegistryById(id: UUID, dto: ProfileRegistryDTO): Promise<ProfileRegistryClientDTO | null> {
        dto.job = dto.job || null
        const exists = await this.userRepository.exists({
            where: {
                id,
                isVerified: true
            }
        })
        if (!exists) {
            return null
        }
        const firstName = dto.firstName
        const lastName = dto.lastName
        const gender = dto.gender
        const job = dto.job
        const initials = dto.firstName.charAt(0).toUpperCase() + dto.lastName.charAt(0).toUpperCase()
        const result: Pick<User, 'firstName' | 'lastName' | 'gender' | 'job' | 'initials'> = {
            firstName,
            lastName,
            gender,
            job,
            initials
        }
        await this.userRepository.update({ id }, {
            ...result,
            updatedAt: Date.now()
        })
        return result

    }

    public async updatePasswordHashByUserId(userId: UUID, passwordHash: string): Promise<void> | never {
        try {
            await this.userRepository.update({ id: userId }, { passwordHash, updatedAt: Date.now() })
        } catch (e) {
            this.logger.warn('updatePasswordHashByUserId => Error ', e as object)
            throw applicationError(ApplicationErrorCode.PERSISTENCE_FAILED)
        }
    }

    public async migratePasswordHash(userId: UUID, currentHash: string, newHash: string): Promise<void> {
        await runInTransaction(this.userRepository.manager, async (_context, manager) => {
            const user = await manager
                .createQueryBuilder(User, 'u')
                .select(['u.id', 'u.passwordHash', 'u.oldPasswordHashes'])
                .where('u.id = :userId', { userId })
                .andWhere('u.isVerified = true')
                .setLock('pessimistic_write')
                .getOneOrFail()

            // Evita race condition: migra solo se il current combacia
            if (user.passwordHash !== currentHash) {
                return
            }

            const oldList: OldPasswordItem[] = Array.isArray(user.oldPasswordHashes)
                ? user.oldPasswordHashes
                : []

            const nextOld: OldPasswordItem[] = [
                { passwordHash: user.passwordHash, changedAt: Date.now() },
                ...oldList,
            ].slice(0, 50)

            await manager
                .createQueryBuilder()
                .update(User)
                .set({ passwordHash: newHash, oldPasswordHashes: nextOld })
                .where('id = :userId', { userId })
                .execute()
        })
    }

    public async getAuthProviderByUserId(id: UUID): Promise<AuthProvider | null> {
        try {
            const { provider } = await this.dataSource.getRepository(AuthIdentity)
                .createQueryBuilder('u')
                .select(['u.provider'])
                .where('u.userId = :userId', { userId: id })
                .getOneOrFail()
            return provider
        } catch {
            return await this.userRepository.exists({
                where: {
                    id
                }
            })
                ? AuthProvider.Mercurion
                : null
        }
    }


}
