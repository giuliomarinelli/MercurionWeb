import { NotebookChapterType } from '../../Models/DTO/lab-notebook/notebook-chapter-type';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotebookChapter } from '../../Models/entities/lab-notebook/lab-notebook-chapter.entity';
import { LabNotebookEntry } from '../../Models/entities/lab-notbook-entry.entity';
import { UUID } from 'crypto';



@Injectable()
export class NotebookChapterService {

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

            const newChapter = manager.create(NotebookChapter, {
                ...data,
                userId,
                notebook: { id: notebookId } as LabNotebookEntry,
                order: (Number(maxOrder) || 0) + 1,
            })

            return manager.save(newChapter)
        })
    }

    private toDTO(chapter: NotebookChapter): NotebookChapterType {
        return {
            id: chapter.id,
            order: chapter.order,
            title: chapter.title,
            userId: chapter.userId,
            sectionIds: undefined,
        }
    }

    async createChapterToDTO(notebookId: UUID, userId: UUID, data: Partial<NotebookChapter>): Promise<NotebookChapterType> {
        const entity = await this.createChapter(notebookId, userId, data)
        return this.toDTO(entity)
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
                relations: ['notebook'],
            })
            if (!chapter) throw new Error('Chapter not found')

            const notebookId = (chapter.notebook as unknown as LabNotebookEntry).id

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

    async listChapters(notebookId: UUID, userId: UUID): Promise<NotebookChapter[]> {
        return this.chapterRepo.find({
            where: { notebook: { id: notebookId, userId } },
            order: { order: 'ASC' },
        })
    }

    async listChaptersToDTO(notebookId: UUID, userId: UUID): Promise<NotebookChapterType[]> {
        return (await this.listChapters(notebookId, userId)).map(c => this.toDTO(c))
    }

    async getChapter(id: UUID): Promise<NotebookChapter | null> {
        return this.chapterRepo.findOne({ where: { id } })
    }

    async updateChapter(id: UUID, userId: UUID, data: Partial<NotebookChapter>): Promise<NotebookChapter | null> {
        await this.chapterRepo.update({ id }, data)
        return this.getChapter(id)
    }
    
    async updateChapterToDTO(id: UUID, userId: UUID, data: Partial<NotebookChapter>): Promise<NotebookChapterType | null> {
        const entity: NotebookChapter | null = await this.updateChapter(id, userId, data)
        return entity != null ? this.toDTO(entity) : null
    }



    async deleteChapter(id: UUID, userId: UUID): Promise<void> {
        await this.chapterRepo.delete({ id, userId })
    }



}
