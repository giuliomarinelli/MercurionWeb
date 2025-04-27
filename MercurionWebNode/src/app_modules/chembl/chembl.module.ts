import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoleculePreviewDBView } from './Models/entities/molecule-preview-db-view.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            MoleculePreviewDBView
        ])
    ]
})
export class ChemblModule { }
