import { MoleculeNameI18nSeedService } from './molecule-name-i18n.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoleculeNameI18n } from './Models/entities/molecule-name-i18n.entity';
import { MoleculeIndexView } from '../chembl_36/Models/entities/molecule-index-mv';
import { MoleculeNameI18nSeedController } from './controllers/molecule-name-i18n-seed.controller';


@Module({
    imports: [
        TypeOrmModule.forFeature([MoleculeNameI18n], 'MercurionConn'),
        TypeOrmModule.forFeature([MoleculeIndexView])
     ],
    providers: [MoleculeNameI18nSeedService],
    controllers: [MoleculeNameI18nSeedController]
})
export class TranslationModule {}
