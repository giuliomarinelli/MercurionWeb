import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoleculePreviewDBView } from '../chembl/Models/entities/molecule-preview-db-view.entity';
import { MoleculeSyncService } from './services/molecule-sync.service';
import { ConfigService } from '@nestjs/config';
import { Meilisearch } from 'meilisearch';

@Module({
    imports: [TypeOrmModule.forFeature([
        MoleculePreviewDBView
    ])],
    providers: [
        MoleculeSyncService,
        {
            provide: 'MEILISEARCH_CLIENT',
            useFactory: (configService: ConfigService) => new Meilisearch({
                host: configService.get<string>('Meilisearch.host') as string,
                apiKey: configService.get<string>('Meilisearch.masterKey')
            }),
            inject: [ConfigService]
        }
    ],
    exports: [MoleculeSyncService]
})
export class MeilisearchModule { }
