import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReleaseVersion } from './Models/entities/release-version.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature(
            [
                ReleaseVersion
            ],
            'MercurionConn')
    ]
})
export class ReleaseVersionModule { }
