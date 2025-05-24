import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { LabNotebook } from '../../Models/entities/lab-notebook/lab-notebook.entity';


@Injectable()
export class LabNotebookService {
    constructor(
        @InjectRepository(LabNotebook)
        private readonly notebookRepo: Repository<LabNotebook>,
    ) { }

    async create(userId: UUID, title: string): Promise<LabNotebook> {
        const notebook = this.notebookRepo.create({ userId, title })
        const saved = await this.notebookRepo.save(notebook)
        saved.chapters = []
        return saved
    }

    async findOne(id: UUID, userId: UUID): Promise<LabNotebook | null> {
        const result: LabNotebook | null = await this.notebookRepo.findOne({
            where: { id, userId },
            relations: [
                'chapters',
                'chapters.sections',
                'chapters.sections.pages'
            ]
        });
        if (!result) {
            return null;
        }
        // Per evitare errori GraphQL su array undefined
        result.chapters ??= [];
        result.chapters.forEach(chapter => {
            chapter.sections ??= [];
            chapter.sections.forEach(section => {
                section.pages ??= [];
            });
        });
        return result;
    }
    async findAllByUser(userId: UUID): Promise<LabNotebook[]> {
        const notebooks = await this.notebookRepo.find({ where: { userId }, order: { createdAt: 'DESC' }, 
            relations: [
                'chapters',
                'chapters.sections',
                'chapters.sections.pages'
            ]})
        for (const n of notebooks) {
            if (n.chapters == undefined) {
                n.chapters = []
            }
        }
        return notebooks
    }

    async update(id: UUID, userId: UUID, data: Partial<LabNotebook>): Promise<LabNotebook | null> {
        await this.notebookRepo.update({ id }, { updatedAt: Date.now(), ...data })
        return this.findOne(id, userId)
    }

    async delete(id: UUID, userId: UUID): Promise<boolean> {
        try {
            await this.notebookRepo.delete({ id, userId })
            return true
        } catch {
            return false
        }
    }
}
