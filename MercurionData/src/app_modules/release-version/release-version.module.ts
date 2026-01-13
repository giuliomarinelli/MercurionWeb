import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReleaseVersion } from './Models/entities/release-version.entity';
import { ReleaseService } from './services/release.service';
import { ReleaseController } from './controllers/release.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature(
            [
                ReleaseVersion
            ],
            'MercurionProdConn')
    ],
    providers: [ReleaseService],
    controllers: [ReleaseController]
})
export class ReleaseVersionModule { }
