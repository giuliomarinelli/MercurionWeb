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
        return this.sectionRepo.manager.transaction(async manager => {
            const { max } = await manager
                .createQueryBuilder(NotebookSection, 'section')
                .where('section.chapter_id = :chapterId', { chapterId })
                .select('MAX(section.order)', 'max')
                .getRawOne() as { max: string | number | null }

            const section = manager.create(NotebookSection, {
                ...data,
                userId,
                chapter: { id: chapterId } as NotebookChapter,
                order: max !== null && max !== undefined ? Number(max) + 1 : 0,
            })

            return manager.save(section)
        })
    }

    private toDTO(entity: NotebookSection): NotebookSectionDTO {
        return {
            id: entity.id,
            chapterId: (entity.chapter as unknown as NotebookChapter).id,
            order: entity.order,
            title: entity.title,
            userId: entity.userId,
            description: entity.description ?? undefined,
        }
    }

    async createToDTO(userId: UUID, chapterId: UUID, data: Partial<NotebookSection>): Promise<NotebookSectionDTO> {
        const entity: NotebookSection = await this.create(userId, chapterId, data)
        entity.chapter = { id: chapterId } as NotebookChapter
        return this.toDTO(entity)
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
        return (await this.list(userId, chapterId)).map(s => this.toDTO(s))
    }

    /**
     * Sposta una sezione su/giù, **solo se di proprietà dell'utente**
     */
    async move(userId: UUID, sectionId: UUID, direction: 'up' | 'down'): Promise<void> {
        await this.sectionRepo.manager.transaction(async manager => {
            const section = await manager.findOne(NotebookSection, {
                where: { id: sectionId, userId },
                relations: { pages: true },
            })
            if (!section) throw new Error('Section not found or not owned')

            const chapterId = (section.chapter as unknown as NotebookChapter).id

            const neighbor = await manager
                .createQueryBuilder(NotebookSection, 's')
                .where('s.chapter_id = :chapterId', { chapterId })
                .andWhere('s.user_id = :userId', { userId })
                .andWhere(direction === 'up' ? 's.order < :order' : 's.order > :order', { order: section.order })
                .orderBy('s.order', direction === 'up' ? 'DESC' : 'ASC')
                .getOne()

            if (!neighbor) return

            const tmp = section.order
            section.order = neighbor.order
            neighbor.order = tmp

            await manager.save([section, neighbor])
        })
    }

    /**
     * Riordina tutte le sezioni di un capitolo per un utente specifico.
     */
    async reorder(userId: UUID, chapterId: UUID, orderedIds: UUID[]): Promise<void> {
        if (orderedIds.length === 0) return

        const cases = orderedIds
            .map((id, idx) => `WHEN id = '${id}' THEN ${idx}`)
            .join(' ')

        await this.sectionRepo.manager.transaction(async manager => {
            await manager
                .createQueryBuilder()
                .update(NotebookSection)
                .set({ order: () => `CASE ${cases} ELSE "order" END` })
                .where('chapter_id = :chapterId', { chapterId })
                .andWhere('user_id = :userId', { userId })
                .andWhere('id IN (:...ids)', { ids: orderedIds })
                .execute()
        })
    }

    async update(userId: UUID, id: UUID, input: Omit<UpdateSectionInput, 'id'>): Promise<NotebookSection | null> {
        await this.sectionRepo.update({ id, userId }, { updatedAt: Date.now(), ...input })
        return this.sectionRepo.findOne({ where: { id, userId }, relations: { pages: true } })
    }

    async updateToDTO(userId: UUID, id: UUID, input: Omit<UpdateSectionInput, 'id'>): Promise<NotebookSectionDTO | null> {
        const entity: NotebookSection | null = await this.update(userId, id, input)
        return entity != null ? this.toDTO(entity) : null
    }

    async delete(userId: UUID, id: UUID): Promise<void> {
        await this.sectionRepo.delete({ id, userId })
    }

    async getSection(id: UUID, userId: UUID): Promise<NotebookSection | null> {
        const result: NotebookSection | null = await this.sectionRepo.findOne({ where: { id, userId }, relations: { pages: true } })
        if (result == null) {
            return result
        }
        if (result.pages == undefined) {
            result.pages = []
        }
        return result
    }


}

