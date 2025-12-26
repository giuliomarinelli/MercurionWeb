import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ReleaseVersion } from '../Models/entities/release-version.entity';
import { Repository } from 'typeorm';
import { IPaginationOptions, paginate, Pagination } from 'nestjs-typeorm-paginate';
import { CreateReleaseVersionDTO } from '../Models/DTO/create-release-version.dto';
import { ReleaseContext } from '../Models/enums/release-context.enum';
import { createHash } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';

@Injectable()
export class ReleaseService {

    constructor(
        @InjectRepository(ReleaseVersion, 'MercurionConn')
        private readonly releaseVersionRepo: Repository<ReleaseVersion>
    ) { }

    async getAll(
        options: IPaginationOptions
    ): Promise<Pagination<ReleaseVersion>> {
        const qb = this.releaseVersionRepo
            .createQueryBuilder('rv')
            .orderBy('rv.created_at', 'DESC')

        return paginate<ReleaseVersion>(qb, options)
    }

    async createVersion(dto: CreateReleaseVersionDTO): Promise<ReleaseVersion> {

        return this.releaseVersionRepo.manager.transaction(async (manager) => {

            const repo = manager.getRepository(ReleaseVersion)

            const latest = await repo
                .createQueryBuilder('rv')
                .setLock('pessimistic_write')
                .where('rv.context = :context', { context: dto.context })
                .andWhere('rv.major = :major', { major: dto.major })
                .andWhere('rv.minor = :minor', { minor: dto.minor })
                .orderBy('rv.created_at', 'DESC')
                .getOne()

            
            const isBeta = dto.context === ReleaseContext.BETA
            const isProd = dto.context === ReleaseContext.PROD

            if (!isBeta && !isProd) {
                throw new BadRequestException('Invalid context')
            }

            let patch: number | null = null
            let betaIteration: number | null = null

            if (isBeta) {
                const lastIter = latest?.betaIteration ?? 0
                betaIteration = lastIter + 1
                patch = null
            }

            if (isProd) {
                betaIteration = null

                const isHotfix = dto.isHotfix === true

                if (!latest) {
                    patch = 0
                } else {
                    const lastPatch = latest.patch ?? 0
                    patch = isHotfix ? lastPatch + 1 : 0
                }
            }

            const versionString = isBeta
                ? `${dto.major}.${dto.minor}-beta-${betaIteration}`
                : `${dto.major}.${dto.minor}.${patch}`
            
            const sourceRef = `${dto.commitId}@${versionString}`
            const versionSha256 = createHash('sha256').update(sourceRef).digest('hex')
            
            const entity = repo.create({
                id: uuidv7(),
                context: dto.context,
                major: dto.major,
                minor: dto.minor,
                patch,
                betaIteration,
                versionString,
                sourceRef,
                versionSha256,
                releaseNotes: dto.releaseNotes ?? null,
            })
            
            return repo.save(entity)

        })
    }


}
