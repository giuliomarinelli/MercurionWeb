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

    async create(notebookId: UUID, data: Partial<NotebookChapter>): Promise<NotebookChapter> {
        const { max } = await this.chapterRepo
            .createQueryBuilder('chapter')
            .where('chapter.notebook_id = :notebookId', { notebookId })
            .select('MAX(chapter.order)', 'max')
            .getRawOne() as { max: string | number | null }

        const chapter = this.chapterRepo.create({
            ...data,
            notebook: { id: notebookId } as LabNotebookEntry,
            order: max !== null && max !== undefined ? Number(max) + 1 : 0,
        })

        return this.chapterRepo.save(chapter);
    }

    async list(notebookId: UUID): Promise<NotebookChapter[]> {
        return this.chapterRepo.find({
            where: { notebook: { id: notebookId } },
            order: { order: 'ASC' },
        });
    }

    async move(chapterId: UUID, direction: 'up' | 'down'): Promise<void> {
        const chapter = await this.chapterRepo.findOne({
            where: { id: chapterId },
            relations: ['notebook'],
        });
        if (!chapter) throw new Error('Chapter not found');

        const notebookId = (chapter.notebook as unknown as LabNotebookEntry).id;

        const neighbor = await this.chapterRepo.createQueryBuilder('c')
            .where('c.notebook_id = :notebookId', { notebookId })
            .andWhere(direction === 'up' ? 'c.order < :order' : 'c.order > :order', { order: chapter.order })
            .orderBy('c.order', direction === 'up' ? 'DESC' : 'ASC')
            .getOne();

        if (!neighbor) return;

        const tmp = chapter.order
        chapter.order = neighbor.order
        neighbor.order = tmp

        await this.chapterRepo.save([chapter, neighbor]);
    }

    async reorder(notebookId: UUID, orderedIds: UUID[]): Promise<void> {
        for (let i = 0; i < orderedIds.length; i++) {
            await this.chapterRepo.update({ id: orderedIds[i], notebook: { id: notebookId } }, { order: i });
        }
    }
}
