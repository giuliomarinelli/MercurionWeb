import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotebookPage } from '../../Models/entities/lab-notebook/lab-notebook-page.entity';
import { UUID } from 'crypto';
import { NotebookSection } from '../../Models/entities/lab-notebook/lab-notebook-section.entity';


@Injectable()
export class NotebookPageService {

    constructor(
        @InjectRepository(NotebookPage)
        private readonly pageRepo: Repository<NotebookPage>
    ) { }

    async createPage(sectionId: UUID, userId: UUID, data: Partial<NotebookPage>): Promise<NotebookPage> {
        return this.pageRepo.manager.transaction(async manager => {
            const { max } = await manager
                .createQueryBuilder(NotebookPage, 'page')
                .where('page.section_id = :sectionId', { sectionId })
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

    async getPage(id: UUID, userId: UUID): Promise<NotebookPage | null> {
       const result = await this.pageRepo.findOne({ where: { id, userId }, relations: { links: true, section: true } })
       if (result && result.links === undefined) {
           result.links = []
       }
       return result
    }

    async listPages(sectionId: UUID): Promise<NotebookPage[]> {
        const pages = await this.pageRepo.find({
            where: { section: { id: sectionId } },
            order: { order: 'ASC' },
            relations: { links: true, section: true }
        })
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
                .where('p.section_id = :sectionId', { sectionId })
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
                .where('section_id = :sectionId', { sectionId })
                .andWhere('id IN (:...ids)', { ids: orderedIds })
                .execute()
        })
    }

    async findBySection(sectionId: UUID, userId: UUID): Promise<NotebookPage[]> {
        const pages = await this.pageRepo.find({
            where: { section: { id: sectionId, userId } },
            relations: { section: true, links: true },
            order: { order: 'ASC' }
        })
        for (const p of pages) {
            if (p.links === undefined) {
                p.links = []
            }
        }
        return pages
    }




}

