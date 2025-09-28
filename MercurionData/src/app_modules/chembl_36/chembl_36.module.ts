import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoleculePreviewView } from './Models/entities/molecule-preview-view';

@Module({
    imports: [
        TypeOrmModule.forFeature([MoleculePreviewView])
    ],
    exports: [TypeOrmModule]
})
export class Chembl36Module {}
