import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReleaseVersion } from './models/entities/release-version.entity';
import { ReleaseService } from './services/release.service';
import { BuildIdentityController } from './controllers/build-identity.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature(
            [
                ReleaseVersion
            ]
        )
    ],
    controllers: [BuildIdentityController],
    exports: [],
    providers: [ReleaseService]
})
export class ReleaseVersionModule { }
