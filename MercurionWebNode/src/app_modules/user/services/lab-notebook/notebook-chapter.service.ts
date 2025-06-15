import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotebookChapter } from '../../Models/entities/lab-notebook/lab-notebook-chapter.entity';
import { UUID } from 'crypto';
import { RpcException } from '@nestjs/microservices';
import { GraphqlUtils } from 'src/graphql-utils/graphql-utils';
import { GraphQLFieldsMap, TypeOrmUtils } from 'src/type-orm-utils/type-orm-utils';
import { LabNotebook } from '../../Models/entities/lab-notebook/lab-notebook.entity';



@Injectable()
export class NotebookChapterService {

    private readonly NOTEBOOK_CHAPTER_REQUIRED_FIELDS = ['id', 'userId', 'title', 'order', 'notebook']

    constructor(
        @InjectRepository(NotebookChapter)
        private readonly chapterRepo: Repository<NotebookChapter>,
    ) { }

    async createChapter(notebookId: UUID, userId: UUID, data: Partial<NotebookChapter>): Promise<NotebookChapter> {
        return this.chapterRepo.manager.transaction(async manager => {
            const { max } = await manager
                .createQueryBuilder(NotebookChapter, 'chapter')
                .where('chapter.notebook_id = :notebookId', { notebookId })
                .select('MAX(chapter.order)', 'max')
                .getRawOne() as { max: string | number | null }

            const maxOrder = max != null ? Number(max) : 0

            this.chapterRepo.createQueryBuilder()

            const newChapter = manager.create(NotebookChapter, {
                ...data,
                userId,
                notebook: { id: notebookId } as LabNotebook,
                order: (Number(maxOrder) || 0) + 1,
            })

            const saved = await manager.save(newChapter)
            saved.sections = []
            return saved
        })
    }


    async list(notebookId: UUID, userId: UUID): Promise<NotebookChapter[]> {
        return this.chapterRepo.find({
            where: { notebook: { id: notebookId, userId } },
            order: { order: 'ASC' },
        });
    }

    async move(chapterId: UUID, direction: 'up' | 'down'): Promise<void> {
        await this.chapterRepo.manager.transaction(async manager => {
            const chapter = await manager.findOne(NotebookChapter, {
                where: { id: chapterId },
                relations: {
                    notebook: true
                },
            })
            if (!chapter) throw new RpcException('LabNotebook::Chapter not found')

            const notebookId = (chapter.notebook as unknown as LabNotebook).id

            const neighbor = await manager
                .createQueryBuilder(NotebookChapter, 'c')
                .where('c.notebook_id = :notebookId', { notebookId })
                .andWhere(direction === 'up' ? 'c.order < :order' : 'c.order > :order', { order: chapter.order })
                .orderBy('c.order', direction === 'up' ? 'DESC' : 'ASC')
                .getOne()

            if (!neighbor) return

            const tmp = chapter.order
            chapter.order = neighbor.order
            neighbor.order = tmp

            await manager.save([chapter, neighbor])
        })
    }

    async reorder(notebookId: UUID, orderedIds: UUID[]): Promise<void> {
        if (orderedIds.length === 0) return

        const cases = orderedIds
            .map((id, idx) => `WHEN id = '${id}' THEN ${idx}`)
            .join(' ')

        await this.chapterRepo.manager.transaction(async manager => {
            await manager
                .createQueryBuilder()
                .update(NotebookChapter)
                .set({ order: () => `CASE ${cases} ELSE "order" END` })
                .where('notebook_id = :notebookId', { notebookId })
                .andWhere('id IN (:...ids)', { ids: orderedIds })
                .execute()
        })
    }

    async listChapters(
        notebookId: UUID,
        userId: UUID,
        fieldsMap: GraphQLFieldsMap
    ): Promise<NotebookChapter[]> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap);
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.NOTEBOOK_CHAPTER_REQUIRED_FIELDS);

        let qb = this.chapterRepo.createQueryBuilder('chapter')
            .select(columns.map(col => `chapter.${col}`))
            .where('chapter.notebook_id = :notebookId', { notebookId })
            .andWhere('chapter.userId = :userId', { userId })
            .orderBy('chapter.order', 'ASC');

        qb = TypeOrmUtils.addJoins(qb, 'chapter', fieldsMap);

        const chapters = await qb.getMany()
        for (const c of chapters) {
            c.sections ??= []
            for (const section of c.sections) {
                section.pages ??= []
            }
        }
        return chapters
    }

    async getChapter(
        id: UUID,
        userId: UUID,
        fieldsMap: GraphQLFieldsMap
    ): Promise<NotebookChapter | null> {

        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.NOTEBOOK_CHAPTER_REQUIRED_FIELDS)

        let qb = this.chapterRepo.createQueryBuilder('chapter')
            .select(columns.map(col => `chapter.${col}`))
            .where('chapter.id = :id', { id })
            .andWhere('chapter.userId = :userId', { userId })

        qb = TypeOrmUtils.addJoins(qb, 'chapter', fieldsMap)

        const result = await qb.getOne();
        if (result && result.sections == undefined) {
            result.sections = []
            for (const section of result.sections) {
                section.pages ??= []
            }
        }
        return result;
    }

    async updateChapter(
        id: UUID,
        userId: UUID,
        data: Partial<NotebookChapter>,
        fieldsMap: GraphQLFieldsMap
    ): Promise<NotebookChapter | null> {
        await this.chapterRepo.update({ id, userId }, { updatedAt: Date.now(), ...data });
        return this.getChapter(id, userId, fieldsMap); // <--- passalo qui
    }





    async deleteChapter(id: UUID, userId: UUID): Promise<void> {
        await this.chapterRepo.delete({ id, userId })
    }



}
