import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { LabNotebook } from '../../Models/entities/lab-notebook/lab-notebook.entity';
import { GraphqlUtils } from 'src/graphql-utils/graphql-utils';


@Injectable()
export class LabNotebookService {

    private readonly LAB_NOTEBOOK_REQUIRED_FIELDS = ['id', 'userId', 'title']

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

    async findOne(
        id: UUID,
        userId: UUID,
        scalarFields: string[] = [],
        relationalFields: string[] = []
    ): Promise<LabNotebook | null> {
        
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.LAB_NOTEBOOK_REQUIRED_FIELDS);

        let qb = this.notebookRepo.createQueryBuilder('labNotebook')
            .select(columns.map(col => `labNotebook.${col}`))
            .where('labNotebook.id = :id', { id })
            .andWhere('labNotebook.userId = :userId', { userId })

        if (relationalFields.includes('chapters')) {
            qb = qb.leftJoinAndSelect('labNotebook.chapters', 'chapters')
        }

        const result = await qb.getOne();

        if (result) {
            result.chapters ??= [];
            result.chapters.forEach(chapter => {
                chapter.sections ??= [];
                chapter.sections.forEach(section => {
                    section.pages ??= []
                });
            });
        }
        return result ?? null
    }

    async findAllByUser(
        userId: UUID,
        scalarFields: string[] = [],
        relationalFields: string[] = []
    ): Promise<LabNotebook[]> {
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.LAB_NOTEBOOK_REQUIRED_FIELDS)

        let qb = this.notebookRepo.createQueryBuilder('labNotebook')
            .select(columns.map(col => `labNotebook.${col}`))
            .where('labNotebook.userId = :userId', { userId })
            .orderBy('labNotebook.createdAt', 'DESC');

        if (relationalFields.includes('chapters')) {
            qb = qb.leftJoinAndSelect('labNotebook.chapters', 'chapters');
        }

        const notebooks = await qb.getMany();
        for (const n of notebooks) {
            n.chapters ??= [];
        }
        return notebooks;
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
