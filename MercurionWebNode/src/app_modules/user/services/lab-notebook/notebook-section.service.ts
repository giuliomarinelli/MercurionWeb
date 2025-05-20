import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotebookSection } from '../../Models/entities/lab-notebook/lab-notebook-section.entity';
import { NotebookChapter } from '../../Models/entities/lab-notebook/lab-notebook-chapter.entity';
import { UUID } from 'crypto';

@Injectable()
export class NotebookSectionService {
    
    constructor(
        @InjectRepository(NotebookSection)
        private readonly sectionRepo: Repository<NotebookSection>,
    ) { }

    async create(chapterId: string, data: Partial<NotebookSection>): Promise<NotebookSection> {
        const { max } = await this.sectionRepo
            .createQueryBuilder('section')
            .where('section.chapter_id = :chapterId', { chapterId })
            .select('MAX(section.order)', 'max')
            .getRawOne() as { max: string | number | null };

        const section = this.sectionRepo.create({
            ...data,
            chapter: { id: chapterId } as NotebookChapter,
            order: max !== null && max !== undefined ? Number(max) + 1 : 0,
        });

        return this.sectionRepo.save(section);
    }

    async list(chapterId: UUID): Promise<NotebookSection[]> {
        return this.sectionRepo.find({
            where: { chapter: { id: chapterId } },
            order: { order: 'ASC' },
        });
    }

    async move(sectionId: UUID, direction: 'up' | 'down'): Promise<void> {
        const section = await this.sectionRepo.findOne({
            where: { id: sectionId },
            relations: ['chapter'],
        });
        if (!section) throw new Error('Section not found');

        const chapterId = (section.chapter as unknown as NotebookChapter).id;

        const neighbor = await this.sectionRepo.createQueryBuilder('s')
            .where('s.chapter_id = :chapterId', { chapterId })
            .andWhere(direction === 'up' ? 's.order < :order' : 's.order > :order', { order: section.order })
            .orderBy('s.order', direction === 'up' ? 'DESC' : 'ASC')
            .getOne();

        if (!neighbor) return;

        const tmp = section.order;
        section.order = neighbor.order;
        neighbor.order = tmp;

        await this.sectionRepo.save([section, neighbor]);
    }

    async reorder(chapterId: UUID, orderedIds: UUID[]): Promise<void> {
        for (let i = 0; i < orderedIds.length; i++) {
            await this.sectionRepo.update({ id: orderedIds[i], chapter: { id: chapterId } }, { order: i });
        }
    }
}
