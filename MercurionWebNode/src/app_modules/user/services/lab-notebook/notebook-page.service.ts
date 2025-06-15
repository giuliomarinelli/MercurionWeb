import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotebookPage } from '../../Models/entities/lab-notebook/lab-notebook-page.entity';
import { UUID } from 'crypto';
import { NotebookSection } from '../../Models/entities/lab-notebook/lab-notebook-section.entity';
import { GraphqlUtils } from 'src/graphql-utils/graphql-utils';

@Injectable()
export class NotebookPageService {

    private readonly NOTEBOOK_PAGE_REQUIRED_FIELDS = ['id', 'userId', 'title', 'order', 'section']

    constructor(
        @InjectRepository(NotebookPage)
        private readonly pageRepo: Repository<NotebookPage>
    ) { }

    async createPage(sectionId: UUID, userId: UUID, data: Partial<NotebookPage>): Promise<NotebookPage> {
        return this.pageRepo.manager.transaction(async manager => {
            const { max } = await manager
                .createQueryBuilder(NotebookPage, 'page')
                .where('page.section_id = :sectionId', { sectionId })  // snake_case
                .select('MAX(page.order)', 'max')
                .getRawOne() as { max: string | number | null }

            const maxOrder = max != null ? Number(max) : 0

            const newPage = manager.create(NotebookPage, {
                ...data,
                userId,
                section: { id: sectionId } as NotebookSection,
                order: (Number(maxOrder) || 0) + 1
            })

            return manager.save(newPage)
        })
    }

    async getPage(
        id: UUID,
        userId: UUID,
        scalarFields: string[] = [],
        relationalFields: string[] = []
    ): Promise<NotebookPage | null> {
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.NOTEBOOK_PAGE_REQUIRED_FIELDS)

        let qb = this.pageRepo.createQueryBuilder('page')
            .select(columns.map(col => `page.${col}`))
            .where('page.id = :id', { id })
            .andWhere('page.user_id = :userId', { userId })  // snake_case

        if (relationalFields.includes('links')) {
            qb = qb.leftJoinAndSelect('page.links', 'links')
        }
        if (relationalFields.includes('section')) {
            qb = qb.leftJoinAndSelect('page.section', 'section')
        }

        const result = await qb.getOne();
        if (result && result.links === undefined) result.links = []
        return result;
    }

    async findBySection(
        sectionId: UUID,
        userId: UUID,
        scalarFields: string[] = [],
        relationalFields: string[] = []
    ): Promise<NotebookPage[]> {
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.NOTEBOOK_PAGE_REQUIRED_FIELDS)

        let qb = this.pageRepo.createQueryBuilder('page')
            .select(columns.map(col => `page.${col}`))
            .where('page.section_id = :sectionId', { sectionId })   // snake_case
            .andWhere('page.user_id = :userId', { userId })         // snake_case
            .orderBy('page.order', 'ASC');

        if (relationalFields.includes('links')) {
            qb = qb.leftJoinAndSelect('page.links', 'links');
        }
        if (relationalFields.includes('section')) {
            qb = qb.leftJoinAndSelect('page.section', 'section');
        }

        const pages = await qb.getMany();
        for (const p of pages) {
            if (p.links === undefined) {
                p.links = []
            }
        }
        return pages
    }

    async listPages(
        sectionId: UUID,
        scalarFields: string[] = [],
        relationalFields: string[] = []
    ): Promise<NotebookPage[]> {

        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.NOTEBOOK_PAGE_REQUIRED_FIELDS)

        let qb = this.pageRepo.createQueryBuilder('page')
            .select(columns.map(col => `page.${col}`))
            .where('page.section_id = :sectionId', { sectionId }) // snake_case
            .orderBy('page.order', 'ASC')

        if (relationalFields.includes('links')) {
            qb = qb.leftJoinAndSelect('page.links', 'links')
        }
        if (relationalFields.includes('section')) {
            qb = qb.leftJoinAndSelect('page.section', 'section')
        }

        const pages = await qb.getMany();
        for (const p of pages) {
            if (p.links === undefined) {
                p.links = []
            }
        }
        return pages
    }

    async updatePage(id: UUID, userId: UUID, data: Partial<NotebookPage>): Promise<NotebookPage | null> {
        await this.pageRepo.update({ id, userId }, { updatedAt: Date.now(), ...data })
        return this.getPage(id, userId)
    }

    async deletePage(id: UUID, userId: UUID): Promise<boolean> {
        try {
            await this.pageRepo.delete({ id, userId })
            return true
        } catch {
            return false
        }
    }

    async movePage(pageId: UUID, direction: 'up' | 'down'): Promise<void> {
        await this.pageRepo.manager.transaction(async manager => {
            const page = await manager.findOne(NotebookPage, {
                where: { id: pageId },
                relations: ['section'],
            })
            if (!page) throw new Error('Page not found')

            const sectionId = page.section.id

            const neighbor = await manager
                .createQueryBuilder(NotebookPage, 'p')
                .where('p.section_id = :sectionId', { sectionId }) // snake_case
                .andWhere(direction === 'up' ? 'p.order < :order' : 'p.order > :order', { order: page.order })
                .orderBy('p.order', direction === 'up' ? 'DESC' : 'ASC')
                .getOne()

            if (!neighbor) return

            const tmp = page.order
            page.order = neighbor.order
            neighbor.order = tmp

            await manager.save([page, neighbor])
        })
    }

    async reorderPages(sectionId: UUID, orderedIds: UUID[]): Promise<void> {
        if (orderedIds.length === 0) return

        const cases = orderedIds
            .map((id, idx) => `WHEN id = '${id}' THEN ${idx}`)
            .join(' ')

        await this.pageRepo.manager.transaction(async manager => {
            await manager
                .createQueryBuilder()
                .update(NotebookPage)
                .set({ order: () => `CASE ${cases} ELSE "order" END` })
                .where('section_id = :sectionId', { sectionId }) // snake_case
                .andWhere('id IN (:...ids)', { ids: orderedIds })
                .execute()
        })
    }
}
