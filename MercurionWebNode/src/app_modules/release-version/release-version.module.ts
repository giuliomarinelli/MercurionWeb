import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReleaseVersion } from './Models/entities/release-version.entity';
import { ReleaseService } from './services/release.service';

@Module({
    imports: [
        TypeOrmModule.forFeature(
            [
                ReleaseVersion
            ]
        )
    ],
    exports: [],
    providers: [ReleaseService]
})
export class ReleaseVersionModule { }
