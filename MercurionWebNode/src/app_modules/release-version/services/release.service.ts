import { Injectable } from '@nestjs/common';
import { VersionDTO } from 'src/app_modules/auth/Models/DTO/version.dto';
import { DataSource } from 'typeorm';
import { ReleaseVersion } from '../Models/entities/release-version.entity';
import { ConfigService } from '@nestjs/config';
import { Environment } from 'src/config/config';
import { createHash } from 'crypto';
import { ReleaseContext } from '../Models/enums/release-context.enum';

@Injectable()
export class ReleaseService {

    constructor(
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService
    ) { }

    async getCurrentVersion(): Promise<VersionDTO> {

        const env = this.configService.get<Environment>('App.env')!

        const isLocalEnv = env === Environment.Development || env === Environment.Test

        if (isLocalEnv) {
            const version = this.configService.get<string>('App.version')!
            return {
                version,
                versionHash: createHash('sha256')
                    .update(version)
                    .digest('hex')
            }
        }

        let context: ReleaseContext = ReleaseContext.BETA

        switch (env) {
            case Environment.Staging:
                context = ReleaseContext.BETA
                break
            case Environment.Production:
                context = ReleaseContext.PROD
                break
        }

        const { versionString, versionSha256 } = await this.dataSource.createQueryBuilder(ReleaseVersion, 'r')
            .where('r.context = :context', { context })
            .orderBy('id DESC')
            .getOneOrFail()

        return {
            version: versionString,
            versionHash: versionSha256
        }
    }

}
