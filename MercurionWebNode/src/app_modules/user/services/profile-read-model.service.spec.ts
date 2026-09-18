import { ProfileReadModelService } from './profile-read-model.service'

describe('ProfileReadModelService', () => {
    const userId = '00000000-0000-0000-0000-000000000001' as any
    const manager = {} as any

    function createService(profileRow: any, rawCounts = {
        personalMoleculeCount: '2',
        chemblMoleculeCount: '3',
    }, collectionCount = 4, ssoIdentity: { email: string } | null = { email: 'sso@example.com' }) {
        const queryBuilder = {
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            setParameters: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue(rawCounts),
        }
        manager.findOne = jest.fn()
            .mockResolvedValueOnce(profileRow)
            .mockResolvedValueOnce(profileRow?.sso ? ssoIdentity : null)
        manager.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder)
        manager.count = jest.fn().mockResolvedValue(collectionCount)
        const history = {
            getRecentHistoryTinyDistinctPerDayWithManager: jest.fn().mockResolvedValue([]),
        }
        const security = {
            maskEmail: jest.fn((email: string) => `masked:${email}`),
            maskPhone: jest.fn((phone: string) => `masked:${phone}`),
        }
        const dataSource = {
            transaction: jest.fn(async (work: (txManager: any) => Promise<unknown>) => work(manager)),
        }

        return {
            service: new ProfileReadModelService(dataSource as any, history as any, security as any),
            dataSource,
            history,
            security,
            queryBuilder,
        }
    }

    it('projects native profiles from one transaction manager with bounded metric queries', async () => {
        const profileRow = {
            id: userId,
            firstName: 'Native',
            lastName: 'User',
            gender: 'undefined',
            job: 'Researcher',
            email: 'native@example.com',
            completePhoneNumber: '+391234567890',
            avatarId: null,
            sso: false,
            initials: 'NU',
        }
        const { service, dataSource, history, security, queryBuilder } = createService(profileRow)

        const result = await service.getVerifiedUserProfileById(userId)

        expect(dataSource.transaction).toHaveBeenCalledTimes(1)
        expect(manager.findOne).toHaveBeenCalledTimes(1)
        expect(manager.createQueryBuilder).toHaveBeenCalledTimes(1)
        expect(manager.count).toHaveBeenCalledTimes(1)
        expect(history.getRecentHistoryTinyDistinctPerDayWithManager).toHaveBeenCalledWith(userId, 7, manager)
        expect(security.maskEmail).toHaveBeenCalledWith('native@example.com')
        expect(security.maskPhone).toHaveBeenCalledWith('+391234567890')
        expect(queryBuilder.getRawOne).toHaveBeenCalledTimes(1)
        expect(Object.isFrozen(result)).toBe(true)
        expect(result).toMatchObject({
            firstName: 'Native',
            obscuredEmail: 'masked:native@example.com',
            obscuredPhone: 'masked:+391234567890',
            personalMoleculeCount: 2,
            chemblMoleculeCount: 3,
            collectionCount: 4,
        })
    })

    it('uses the SSO identity from the same snapshot and does not read native email', async () => {
        const profileRow = {
            id: userId,
            firstName: 'SSO',
            lastName: 'User',
            gender: 'undefined',
            job: null,
            email: null,
            completePhoneNumber: null,
            avatarId: null,
            sso: true,
            initials: 'SU',
        }
        const { service, security } = createService(profileRow)

        const result = await service.getVerifiedUserProfileById(userId, false)

        expect(manager.findOne).toHaveBeenCalledTimes(2)
        expect(security.maskEmail).toHaveBeenCalledWith('sso@example.com')
        expect(result?.obscuredEmail).toBe('masked:sso@example.com')
        expect(result?.recentHistory).toEqual([])
    })

    it('returns null when an SSO identity is missing', async () => {
        const profileRow = {
            id: userId,
            firstName: 'SSO',
            lastName: 'User',
            sso: true,
            email: null,
        }
        const { service } = createService(profileRow, undefined, 4, null)

        await expect(service.getVerifiedUserProfileById(userId)).resolves.toBeNull()
        expect(manager.createQueryBuilder).not.toHaveBeenCalled()
        expect(manager.count).not.toHaveBeenCalled()
    })
})
