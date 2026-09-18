import { Injectable } from '@nestjs/common'
import { DataSource, EntityManager } from 'typeorm'
import { UUID } from 'crypto'
import { MoleculeCollection } from 'src/app_modules/molecule-collection/models/entities/molecule-collection.entity'
import { MoleculeCollectionItemEntity } from 'src/app_modules/molecule-collection/models/entities/molecule-collection-item.entity'
import { AuthIdentity } from 'src/app_modules/sso/models/entities/auth-identity.entity'
import { User } from '../models/entities/user.entity'
import { ProfileDTO } from 'src/app_modules/auth/models/dto/profile.dtos'
import { TinyHistoryDTO } from 'src/app_modules/history/models/dto/history.dto'
import { HistoryService } from 'src/app_modules/history/services/history.service'
import { SecurityService } from 'src/app_modules/auth/services/security.service'
import { runInTransaction } from 'src/persistence/transaction-context'

export type ProfileReadModel = Readonly<ProfileDTO>

type ProfileMetricRow = {
    personalMoleculeCount: string | number
    chemblMoleculeCount: string | number
}

@Injectable()
export class ProfileReadModelService {

    constructor(
        private readonly dataSource: DataSource,
        private readonly historyService: HistoryService,
        private readonly securityService: SecurityService,
    ) {}

    public getVerifiedUserProfileById(
        id: UUID,
        getRecentHistory = true,
    ): Promise<ProfileReadModel | null> {
        return runInTransaction(this.dataSource, async (_context, manager) => {
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
                    initials: true,
                },
            })

            if (!profileRow) {
                return null
            }

            const email = await this.readProfileEmail(manager, profileRow)
            if (email === null) {
                return null
            }

            const metrics = await this.readProfileMetrics(manager, id)
            const recentHistory: TinyHistoryDTO[] = getRecentHistory
                ? await this.historyService.getRecentHistoryTinyDistinctPerDayWithManager(id, 7, manager)
                : []

            return Object.freeze({
                firstName: profileRow.firstName,
                lastName: profileRow.lastName,
                gender: profileRow.gender,
                job: profileRow.job,
                obscuredEmail: this.securityService.maskEmail(email),
                obscuredPhone: profileRow.completePhoneNumber
                    ? this.securityService.maskPhone(profileRow.completePhoneNumber)
                    : null,
                avatarId: profileRow.avatarId,
                recentHistory,
                personalMoleculeCount: metrics.personalMoleculeCount,
                chemblMoleculeCount: metrics.chemblMoleculeCount,
                collectionCount: metrics.collectionCount,
                initials: profileRow.initials,
            })
        })
    }

    private async readProfileEmail(
        manager: EntityManager,
        profileRow: Pick<User, 'id' | 'email' | 'sso'>,
    ): Promise<string | null> {
        if (!profileRow.sso) {
            return profileRow.email
        }

        const identity = await manager.findOne(AuthIdentity, {
            where: { userId: profileRow.id },
            select: { email: true },
        })
        return identity?.email ?? null
    }

    private async readProfileMetrics(
        manager: EntityManager,
        userId: UUID,
    ): Promise<{
        personalMoleculeCount: number
        chemblMoleculeCount: number
        collectionCount: number
    }> {
        const itemCounts = await manager
            .createQueryBuilder(MoleculeCollectionItemEntity, 'item')
            .select('COUNT(*) FILTER (WHERE item.type = :custom)', 'personalMoleculeCount')
            .addSelect('COUNT(*) FILTER (WHERE item.type = :chembl)', 'chemblMoleculeCount')
            .where('item.userId = :userId', { userId })
            .setParameters({ custom: 'custom', chembl: 'chembl' })
            .getRawOne<ProfileMetricRow>()

        const collectionCount = await manager.count(MoleculeCollection, {
            where: { userId },
        })

        return {
            personalMoleculeCount: Number(itemCounts?.personalMoleculeCount ?? 0),
            chemblMoleculeCount: Number(itemCounts?.chemblMoleculeCount ?? 0),
            collectionCount,
        }
    }
}
