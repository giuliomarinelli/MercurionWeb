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


    async getChapter(id: UUID): Promise<NotebookChapter | null> {
        const result: NotebookChapter | null = await this.chapterRepo.findOne({ where: { id }, relations: { sections: true } })
        if (result == null) {
            return result
        }
        if (result.sections == undefined) {
            result.sections = []
        }
        return result
    }

    async updateChapter(id: UUID, userId: UUID, data: Partial<NotebookChapter>): Promise<NotebookChapter | null> {
        await this.chapterRepo.update({ id, userId }, { updatedAt: Date.now(), ...data })
        return this.getChapter(id)
    }




    async deleteChapter(id: UUID, userId: UUID): Promise<void> {
        await this.chapterRepo.delete({ id, userId })
    }



}
