import { NotebookChapterType } from './../../Models/DTO/lab-notebook/notebook-chapter';
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

        const { max } = await this.chapterRepo
            .createQueryBuilder('chapter')
            .where('chapter.notebook_id = :notebookId', { notebookId })
            .select('MAX(chapter.order)', 'max')
            .getRawOne() as { max: string | number | null };

        const maxOrder = max != null ? Number(max) : 0;

        const newChapter = this.chapterRepo.create({
            ...data,
            userId,
            notebook: { id: notebookId } as LabNotebookEntry,
            order: (Number(maxOrder) || 0) + 1,
        })

        return await this.chapterRepo.save(newChapter);
    }

    async createChapterToDTO(notebookId: UUID, userId: UUID, data: Partial<NotebookChapter>): Promise<NotebookChapterType> {
        const { id, order, title, userId: _userId }: NotebookChapter = await this.createChapter(notebookId, userId, data)
        return {
            id,
            order,
            sectionIds: undefined,
            title,
            userId: _userId
        }
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

    async listChapters(notebookId: UUID): Promise<NotebookChapter[]> {
        return this.chapterRepo.find({
            where: { notebook: { id: notebookId } },
            order: { order: 'ASC' },
        })
    }

    async listChaptersToDTO(notebookId: UUID): Promise<NotebookChapterType[]> {
        return (await this.listChapters(notebookId)).map(c => {
            const cDTO: NotebookChapterType = {
                id: c.id,
                userId: c.userId,
                title: c.title,
                order: c.order
            }
            return cDTO
        }) 
    }

    async getChapter(id: UUID): Promise<NotebookChapter | null> {
        return this.chapterRepo.findOne({ where: { id } })
    }

    async updateChapter(id: UUID, data: Partial<NotebookChapter>): Promise<NotebookChapter | null> {
        await this.chapterRepo.update({ id }, data)
        return this.getChapter(id)
    }
    
    async updateChapterToDTO(id: UUID, data: Partial<NotebookChapter>): Promise<NotebookChapterType | null> {
        const entity: NotebookChapter | null = await this.updateChapter(id, data)
        return entity != null ? {
            id: entity.id,
            order: entity.order,
            title: entity.title,
            userId: entity.userId,
            createdAt: undefined,
            sectionIds: undefined,
            updatedAt: undefined
        }
        : null
    }



    async deleteChapter(id: UUID): Promise<void> {
        await this.chapterRepo.delete({ id })
    }



}
