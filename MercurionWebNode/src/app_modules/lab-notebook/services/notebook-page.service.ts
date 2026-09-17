import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotebookPage } from '../models/entities/lab-notebook-page.entity';
import { UUID } from 'crypto';
import { NotebookSection } from '../models/entities/lab-notebook-section.entity';
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils';
import { runInTransaction } from 'src/persistence/transaction-context';
import {
    NotebookPageCreateCommand,
    NotebookPagePatchCommand,
    toNotebookPagePatch
} from '../models/dto/notebook-mutation.commands';

@Injectable()
export class NotebookPageService {

    private readonly NOTEBOOK_PAGE_REQUIRED_FIELDS = ['id', 'userId', 'title', 'order', 'section']

    constructor(
        @InjectRepository(NotebookPage)
        private readonly pageRepo: Repository<NotebookPage>
    ) { }

    async createPage(sectionId: UUID, userId: UUID, data: NotebookPageCreateCommand): Promise<NotebookPage> {
        return runInTransaction(this.pageRepo.manager, async (_context, manager) => {
            const { max } = await manager
                .createQueryBuilder(NotebookPage, 'page')
                .where('page.section_id = :sectionId', { sectionId })  // snake_case
                .select('MAX(page.order)', 'max')
                .getRawOne() as { max: string | number | null }

            const maxOrder = max != null ? Number(max) : 0

            const newPage = manager.create(NotebookPage, {
                title: data.title,
                content: data.content,
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
        const columns = GraphQLUtils.ensureRequiredFields(scalarFields, this.NOTEBOOK_PAGE_REQUIRED_FIELDS)

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
        const columns = GraphQLUtils.ensureRequiredFields(scalarFields, this.NOTEBOOK_PAGE_REQUIRED_FIELDS)

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

        const columns = GraphQLUtils.ensureRequiredFields(scalarFields, this.NOTEBOOK_PAGE_REQUIRED_FIELDS)

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

    async updatePage(id: UUID, userId: UUID, data: NotebookPagePatchCommand): Promise<NotebookPage | null> {
        await this.pageRepo.update({ id, userId }, {
            updatedAt: Date.now(),
            ...toNotebookPagePatch(data)
        })
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

    async movePage(pageId: UUID, userId: UUID, direction: 'up' | 'down'): Promise<void> {
        await runInTransaction(this.pageRepo.manager, async (_context, manager) => {
            const page = await manager.findOne(NotebookPage, {
                where: { id: pageId, userId },
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

    async reorderPages(sectionId: UUID, userId: UUID, orderedIds: UUID[]): Promise<void> {
        if (orderedIds.length === 0) return

        const cases = orderedIds
            .map((id, idx) => `WHEN id = '${id}' THEN ${idx}`)
            .join(' ')

        await runInTransaction(this.pageRepo.manager, async (_context, manager) => {
            await manager
                .createQueryBuilder()
                .update(NotebookPage)
                .set({ order: () => `CASE ${cases} ELSE "order" END` })
                .where('section_id = :sectionId', { sectionId })
                .andWhere('user_id = :userId', { userId })
                .andWhere('id IN (:...ids)', { ids: orderedIds })
                .execute()
        })
    }
}
