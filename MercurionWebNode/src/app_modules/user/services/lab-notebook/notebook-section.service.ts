import { NotebookSectionDTO } from './../../Models/DTO/lab-notebook/notebook-section.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotebookSection } from '../../Models/entities/lab-notebook/lab-notebook-section.entity';
import { NotebookChapter } from '../../Models/entities/lab-notebook/lab-notebook-chapter.entity';
import { UUID } from 'crypto';
import { UpdateSectionInput } from '../../Models/DTO/lab-notebook/update-section-input';

@Injectable()
export class NotebookSectionService {

    constructor(
        @InjectRepository(NotebookSection)
        private readonly sectionRepo: Repository<NotebookSection>,
    ) { }

    /**
     * Crea una nuova sezione all'interno di un capitolo, assegnando userId per ownership.
     * @param userId - proprietario della sezione (raccolto da auth context o passato dal resolver)
     * @param chapterId - capitolo di riferimento
     * @param data - dati della sezione
     */
    async create(userId: UUID, chapterId: UUID, data: Partial<NotebookSection>): Promise<NotebookSection> {

        const { max } = await this.sectionRepo
            .createQueryBuilder('section')
            .where('section.chapter_id = :chapterId', { chapterId })
            .select('MAX(section.order)', 'max')
            .getRawOne() as { max: string | number | null };

        const section = this.sectionRepo.create({
            ...data,
            userId, // assegna sempre ownership
            chapter: { id: chapterId } as NotebookChapter,
            order: max !== null && max !== undefined ? Number(max) + 1 : 0,
        });

        return this.sectionRepo.save(section)
    }

    async createToDTO(userId: UUID, chapterId: UUID, data: Partial<NotebookSection>): Promise<NotebookSectionDTO> {
        const entity: NotebookSection = await this.create(userId, chapterId, data)
        return {
            id: entity.id,
            chapterId,
            order: entity.order,
            title: entity.title,
            userId: entity.userId,
            description: entity.description ?? undefined
        }
    }

    /**
     * Lista tutte le sezioni di un capitolo, solo quelle dell'utente loggato.
     */
    async list(userId: UUID, chapterId: UUID): Promise<NotebookSection[]> {
        return this.sectionRepo.find({
            where: { chapter: { id: chapterId }, userId },
            order: { order: 'ASC' },
            relations: { chapter: true }
        })
    }

    async listOfDTOs(userId: UUID, chapterId: UUID): Promise<NotebookSectionDTO[]> {
        return (await this.list(userId, chapterId)).map(s => {
            const sDTO: NotebookSectionDTO = {
                id: s.id,
                title: s.title,
                order: s.order,
                chapterId: s.chapter.id,
                userId: s.userId
            }
            return sDTO
        })
    }

    /**
     * Sposta una sezione su/giù, **solo se di proprietà dell'utente**
     */
    async move(userId: UUID, sectionId: UUID, direction: 'up' | 'down'): Promise<void> {
        const section = await this.sectionRepo.findOne({
            where: { id: sectionId, userId },
            relations: ['chapter'],
        });
        if (!section) throw new Error('Section not found or not owned');

        const chapterId = (section.chapter as unknown as NotebookChapter).id;

        const neighbor = await this.sectionRepo.createQueryBuilder('s')
            .where('s.chapter_id = :chapterId', { chapterId })
            .andWhere('s.user_id = :userId', { userId })
            .andWhere(direction === 'up' ? 's.order < :order' : 's.order > :order', { order: section.order })
            .orderBy('s.order', direction === 'up' ? 'DESC' : 'ASC')
            .getOne();

        if (!neighbor) return;

        const tmp = section.order;
        section.order = neighbor.order;
        neighbor.order = tmp;

        await this.sectionRepo.save([section, neighbor]);
    }

    /**
     * Riordina tutte le sezioni di un capitolo per un utente specifico.
     */
    async reorder(userId: UUID, chapterId: UUID, orderedIds: UUID[]): Promise<void> {
        for (let i = 0; i < orderedIds.length; i++) {
            await this.sectionRepo.update(
                { id: orderedIds[i], chapter: { id: chapterId }, userId },
                { order: i }
            );
        }
    }

    // In NotebookSectionService
    async update(userId: UUID, id: UUID, input: Omit<UpdateSectionInput, 'id'>): Promise<NotebookSection | null> {
        await this.sectionRepo.update({ id, userId }, input)
        return this.sectionRepo.findOneOrFail({ where: { id, userId } })
    }

    async updateToDTO(userId: UUID, id: UUID, input: Omit<UpdateSectionInput, 'id'>): Promise<NotebookSectionDTO | null> {
        const entity: NotebookSection | null = await this.update(userId, id, input)
        return entity != null ? {
            id: entity.id,
            title: entity.title,
            order: entity.order,
            chapterId: entity.chapter.id,
            userId: entity.userId,
            description: entity.description ?? undefined
        }
            : null
    }

    async delete(userId: UUID, id: UUID): Promise<void> {
        await this.sectionRepo.delete({ id, userId });
    }


}
