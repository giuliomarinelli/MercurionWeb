import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoleculePreviewDBView } from './Models/entities/molecule-preview-db-view.entity';
import { MoleculeDetailDBView } from './Models/entities/molecule-detail-db-view.entity';
import { ActivityViewEntity } from './Models/entities/activity-view.entity';
import { ToxicityViewEntity } from './Models/entities/toxicity-view.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            MoleculePreviewDBView,
            MoleculeDetailDBView,
            ActivityViewEntity,
            ToxicityViewEntity
        ],
            'ChemblDB')
    ],
    exports: [TypeOrmModule]
})
export class ChemblModule { }
