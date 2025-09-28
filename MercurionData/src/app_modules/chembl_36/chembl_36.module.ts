import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoleculePreviewView } from './Models/entities/molecule-preview-view';
import { MoleculeIndexView } from './Models/entities/molecule-index-mv';

@Module({
    imports: [
        TypeOrmModule.forFeature([MoleculePreviewView, MoleculeIndexView])
    ],
    exports: [TypeOrmModule]
})
export class Chembl36Module {}
