import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { LabNotebook } from '../../Models/entities/lab-notebook/lab-notebook.entity';
import { GraphqlUtils } from 'src/graphql-utils/graphql-utils';
import { GraphQLFieldsMap, TypeOrmUtils } from 'src/type-orm-utils/type-orm-utils';

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
        fieldsMap: GraphQLFieldsMap
    ): Promise<LabNotebook | null> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.LAB_NOTEBOOK_REQUIRED_FIELDS)

        let qb = this.notebookRepo.createQueryBuilder('lab_notebook')
            .select(columns.map(col => `lab_notebook.${col}`))
            .where('lab_notebook.id = :id', { id })
            .andWhere('lab_notebook.user_id = :userId', { userId }) // SNAKE CASE

        qb = TypeOrmUtils.addJoins(qb, 'lab_notebook', fieldsMap)

        const result = await qb.getOne();

        if (result) {
            result.chapters ??= [];
            for (const chapter of result.chapters) {
                chapter.sections ??= [];
                for (const section of chapter.sections) {
                    section.pages ??= [];
                }
            }
        }
        return result ?? null;
    }

    async findAllByUser(
        userId: UUID,
        fieldsMap: GraphQLFieldsMap
    ): Promise<LabNotebook[]> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap);
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.LAB_NOTEBOOK_REQUIRED_FIELDS);

        let qb = this.notebookRepo.createQueryBuilder('lab_notebook')
            .select(columns.map(col => `lab_notebook.${col}`))
            .where('lab_notebook.user_id = :userId', { userId }) // SNAKE CASE
            .orderBy('lab_notebook.created_at', 'DESC'); // SNAKE CASE

        qb = TypeOrmUtils.addJoins(qb, 'lab_notebook', fieldsMap);

        const notebooks = await qb.getMany();
        for (const n of notebooks) {
            n.chapters ??= [];
            for (const chapter of n.chapters) {
                chapter.sections ??= [];
                for (const section of chapter.sections) {
                    section.pages ??= [];
                }
            }
        }
        return notebooks
    }

    async update(id: UUID, userId: UUID, data: Partial<LabNotebook>, fieldsMap: GraphQLFieldsMap): Promise<LabNotebook | null> {
        await this.notebookRepo.update({ id, userId }, { updatedAt: Date.now(), ...data })
        return this.findOne(id, userId, fieldsMap)
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
