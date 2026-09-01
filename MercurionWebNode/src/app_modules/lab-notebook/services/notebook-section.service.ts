import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotebookSection } from '../Models/entities/lab-notebook-section.entity';
import { NotebookChapter } from '../Models/entities/lab-notebook-chapter.entity';
import { UUID } from 'crypto';
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils';
import { GraphQLFieldsMap, TypeOrmUtils } from 'src/utils/type-orm-utils/type-orm-utils';
import { UpdateSectionInput } from '../Models/DTO/update-section-input';

@Injectable()
export class NotebookSectionService {

    private readonly NOTEBOOK_SECTION_REQUIRED_FIELDS = ['id', 'title', 'userId', 'order', 'chapter']

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
                .where('section.chapter_id = :chapterId', { chapterId }) // fix
                .select('MAX(section.order)', 'max')
                .getRawOne() as { max: string | number | null }

            const section = manager.create(NotebookSection, {
                ...data,
                userId,
                chapter: { id: chapterId } as NotebookChapter,
                order: max !== null && max !== undefined ? Number(max) + 1 : 0,
            })

            const saved = await manager.save(section)
            saved.pages = []
            return saved
        })
    }

    /**
     * Lista tutte le sezioni di un capitolo, solo quelle dell'utente loggato.
     */
    async list(userId: UUID, chapterId: UUID): Promise<NotebookSection[]> {
        // Qui va bene camelCase: JS property-space (TypeORM traduce)
        const sections = await this.sectionRepo.find({
            where: { chapter: { id: chapterId }, userId },
            order: { order: 'ASC' },
            relations: { chapter: true, pages: true }
        })
        for (const s of sections) {
            if (s.pages == undefined) {
                s.pages = []
            }
        }
        return sections
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
                .where('s.chapter_id = :chapterId', { chapterId }) // fix
                .andWhere('s.user_id = :userId', { userId })       // fix
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
                .where('chapter_id = :chapterId', { chapterId }) // fix
                .andWhere('user_id = :userId', { userId })       // fix
                .andWhere('id IN (:...ids)', { ids: orderedIds })
                .execute()
        })
    }

    async delete(userId: UUID, id: UUID): Promise<void> {
        await this.sectionRepo.delete({ id, userId })
    }

    async getSectionByChapterId(
        userId: UUID,
        chapterId: UUID,
        fieldsMap: GraphQLFieldsMap
    ): Promise<NotebookSection | null> {
        const scalarFields = GraphQLUtils.getScalarFields(fieldsMap)
        const columns = GraphQLUtils.ensureRequiredFields(scalarFields, this.NOTEBOOK_SECTION_REQUIRED_FIELDS)

        let qb = this.sectionRepo.createQueryBuilder('section')
            .select(columns.map(col => `section.${col}`))
            .where('section.chapter_id = :chapterId', { chapterId }) // fix
            .andWhere('section.user_id = :userId', { userId })       // fix

        qb = TypeOrmUtils.addJoins(qb, 'section', fieldsMap)

        // Solo il primo matching
        const result = await qb.getOne()
        if (result && !result.pages) result.pages = []
        return result ?? null
    }

    async getSection(
        id: UUID,
        userId: UUID,
        fieldsMap: GraphQLFieldsMap
    ): Promise<NotebookSection | null> {
        const scalarFields = GraphQLUtils.getScalarFields(fieldsMap)
        const columns = GraphQLUtils.ensureRequiredFields(scalarFields, this.NOTEBOOK_SECTION_REQUIRED_FIELDS)

        let qb = this.sectionRepo.createQueryBuilder('section')
            .select(columns.map(col => `section.${col}`))
            .where('section.id = :id', { id })
            .andWhere('section.user_id = :userId', { userId }) // fix

        qb = TypeOrmUtils.addJoins(qb, 'section', fieldsMap)

        const result = await qb.getOne()
        if (result && !result.pages) result.pages = []
        return result ?? null
    }

    async update(
        userId: UUID,
        id: UUID,
        input: Omit<UpdateSectionInput, 'id'>,
        fieldsMap: GraphQLFieldsMap
    ): Promise<NotebookSection | null> {
        await this.sectionRepo.update({ id, userId }, { updatedAt: Date.now(), ...input })
        return this.getSection(id, userId, fieldsMap)
    }

}
