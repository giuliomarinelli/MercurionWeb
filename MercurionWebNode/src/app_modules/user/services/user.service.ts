import { MoleculeCollection } from 'src/app_modules/molecule-collection/Models/entities/molecule-collection.entity';
import { ProfileRegistryClientDTO, ProfileRegistryDTO as ProfileRegistryDTO } from './../../auth/Models/DTO/profile.dtos';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../Models/entities/user.entity';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { UUID } from 'crypto';
import { nullish } from 'src/Models/nullish.type';
import { MfaStrategy } from '../Models/enums/mfa-strategy.enum';
import { IAuth } from 'src/app_modules/auth/Models/interfaces/i-auth.interface';
import { PasswordEncoderService } from 'src/app_modules/auth/services/password-encoder.service';
import { OldPasswordItem } from '../Models/DTO/old-password-item.interface';
import { ProfileDTO } from 'src/app_modules/auth/Models/DTO/profile.dtos';
import { SercurityService } from 'src/app_modules/auth/services/sercurity.service';
import { CompareResult } from 'src/app_modules/auth/Models/enums/compare-result.enum';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import { ScopeService } from 'src/app_modules/auth/services/scope.service';
import { MoleculeCollectionItemEntity } from 'src/app_modules/molecule-collection/Models/entities/molecule-collection-item.entity';
import { HistoryService } from 'src/app_modules/history/services/history.service';
import { HistoryDTO } from 'src/app_modules/history/Models/DTO/history.dto';
import { AuthIdentity } from 'src/app_modules/sso/Models/entities/auth-identity.entity';



@Injectable()
export class UserService {

    private readonly logger: MeiliContextLogger
    private readonly mfaStrategyVals = Object.values(MfaStrategy)

    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        private readonly dataSource: DataSource,
        private readonly passwordEncoder: PasswordEncoderService,
        private readonly scopeService: ScopeService,
        private readonly securityService: SercurityService,
        private readonly historyService: HistoryService,
        meiliLogger: MeiliLoggerService
    ) {
        this.logger = meiliLogger.forContext(UserService.name)
    }

    public async getUserScopesById(userId: UUID): Promise<string[] | null> {
        try {
            const user = await this.userRepository
                .createQueryBuilder("user")
                .select(["user.scopes"])
                .where("user.id = :userId", { userId })
                .getOne()
            if (!user) {
                return null
            }
            return this.scopeService.decryptScopes(...user.scopes)
        } catch (e) {
            this.logger.warn(`Error in getScopesById, userId=${userId}`, e as object)
            return null
        }
    }

    public async createUser(userProps: Partial<User>): Promise<User> {

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            const user = queryRunner.manager.create(User, { ...userProps })
            const u$er = await queryRunner.manager.save(user)
            await queryRunner.commitTransaction()
            return u$er
        } catch (e) {
            this.logger.warn('Error creating new User: ', e as object)
            await queryRunner.rollbackTransaction()
            throw e
        } finally {
            await queryRunner.release()
        }
    }

    public async existsUserById(id: UUID): Promise<boolean> {
        return this.userRepository.exists({ where: { id } })
    }

    public async existsUserByEmail(email: string): Promise<boolean> {
        return this.userRepository.exists({ where: { email, sso: false } })
    }

    public async getUserById(id: UUID, isVerified?: boolean): Promise<User | nullish> {
        const where: FindOptionsWhere<User> = { id }
        if (isVerified != undefined) {
            where.isVerified = isVerified
        }
        return this.userRepository.findOne({ where })
    }

    public async updateUser(id: UUID, userProps: Partial<User>): Promise<User | nullish> {

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()
        try {
            await queryRunner.manager.update<User>(User, { id }, { ...userProps })
            const user = await this.getUserById(id)
            await queryRunner.commitTransaction()
            return user
        } catch {
            queryRunner.rollbackTransaction()
            return null
        } finally {
            queryRunner.release()
        }
    }

    public async getUserEncryptedEnabledMfaStrategies(id: UUID): Promise<string[]> {

        const user = await this.userRepository.createQueryBuilder('u')
            .select(['u.mfaStrategies', 'u.sso'])
            .where('u.id = :id', { id })
            .getOne()

        if (!user) {
            throw new RpcException('MfaSettings::User not found')
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

    public async getVerifiedUserPasswordHashById(userId: UUID): Promise<string | null> | never {
        try {
            const { passwordHash } = await this.userRepository.createQueryBuilder('u')
                .select(['u.passwordHash'])
                .where('u.id = :userId', { userId })
                .andWhere('u.isVerified = true')
                .andWhere('u.sso = false')
                .getOneOrFail()
            return passwordHash
        } catch {
            throw new RpcException('Unauthanticated')
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

    public async getUserEmailById(id: UUID): Promise<string | nullish> {
        const userRow = await this.userRepository.createQueryBuilder('u')
            .select(['u.email', 'u.sso'])
            .where('u.id = :id', { id })
            .getOne()
        if (!userRow) return userRow
        if (userRow.sso) {
            const identityRows = await this.dataSource.getRepository(AuthIdentity).find({
                where: {
                    userId: id
                }
            })
            for (const r of identityRows) {
                if (r.email) {
                    return r.email
                }
            }
        }
        return userRow.email
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
            throw new RpcException('UnprocessableEntity')
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
        await this.updateUser(id, { mfaStrategies })
    }

    public async removeMfaStrategy(id: UUID, strategy: MfaStrategy): Promise<void> {
        const currentStrategies: MfaStrategy[] = (await this.getUserEncryptedEnabledMfaStrategies(id))
            .map((s) => this.securityService.decrypt_AES256(s) as MfaStrategy)
            .filter((s) => this.mfaStrategyVals.includes(s))
        const updated = currentStrategies.filter(s => s !== strategy)
            .map((s) => this.securityService.encrypt_AES256(s))
        const userProps: Partial<User> = {
            mfaStrategies: JSON.stringify(updated)
        }
        if (strategy === MfaStrategy.APP_TOTP) {
            userProps.appTotpSecret = null
        }
        await this.updateUser(id, userProps)
    }

    public async getUserInitialsByUserId(id: UUID): Promise<string | nullish> {
        const result = await this.userRepository.createQueryBuilder('u')
            .select(['u.initials'])
            .where('id = :id', { id })
            .getOne()
        if (!result) {
            return result
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
            return result
        }
        return result.id
    }

    public async changePassword(userId: UUID, newPassword: string): Promise<void> | never {
        await this.userRepository.manager.transaction(async manager => {

            const user = await manager
                .createQueryBuilder(User, 'u')
                .select(['u.id', 'u.passwordHash', 'u.oldPasswordHashes'])
                .where('u.id = :userId', { userId })
                .andWhere('u.isVerified = true')
                .andWhere('u.sso = false')
                .andWhere('u.passwordHash IS NOT NULL')
                .setLock('pessimistic_write')
                .getOneOrFail()

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
                    throw new RpcException('PasswordReused')
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
        })
    }

    public async getVerifiedUserProfileById(id: UUID, getRecentHistory = true): Promise<ProfileDTO | null> {

        try {
            return this.dataSource.manager.transaction(async (manager) => {

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
                let authIdentityRows: AuthIdentity[]

                if (profileRow.sso) {
                    authIdentityRows = await manager.find(AuthIdentity, {
                        where: {
                            userId: id
                        },
                        select: {
                            email: true
                        }
                    })

                    for (const row of authIdentityRows) {
                        if (row.email) {
                            _email = row.email
                            break
                        }
                    }
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

                let recentHistory: HistoryDTO[] = []

                if (getRecentHistory) {
                    ({ items: recentHistory } = await this.historyService.getPaginatedHistoryWithManager(
                        id,
                        {
                            limit: 200,
                            page: 1
                        },
                        manager
                    ))
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
            throw new RpcException('Unauthenticated')
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
            throw new RpcException('PersistenceError')
        }
    }

    public async migratePasswordHash(userId: UUID, currentHash: string, newHash: string): Promise<void> {
        await this.userRepository.manager.transaction(async (manager) => {
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



}
