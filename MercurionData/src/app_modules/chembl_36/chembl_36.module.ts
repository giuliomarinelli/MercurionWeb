import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoleculePreviewView } from './Models/entities/molecule-preview-view';

@Module({
    imports: [
        TypeOrmModule.forFeature([MoleculePreviewView])
    ]
})
export class Chembl36Module {}
