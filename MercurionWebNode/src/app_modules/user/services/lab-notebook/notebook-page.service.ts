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

    async createPage(sectionId: UUID, data: Partial<NotebookPage>): Promise<NotebookPage> {

        const { max } = await this.pageRepo
            .createQueryBuilder('page')
            .where('page.section_id = :sectionId', { sectionId })
            .select('MAX(page.order)', 'max')
            .getRawOne() as { max: string | number | null }

        const maxOrder = max != null ? Number(max) : 0

        const newPage = this.pageRepo.create({
            ...data,
            section: { id: sectionId } as NotebookSection,
            order: (Number(maxOrder) || 0) + 1
        })

        return await this.pageRepo.save(newPage)
    }

    async getPage(id: UUID): Promise<NotebookPage | null> {
        return this.pageRepo.findOne({ where: { id } })
    }

    async listPages(sectionId: UUID): Promise<NotebookPage[]> {
        return this.pageRepo.find({
            where: { section: { id: sectionId } },
            order: { order: 'ASC' }
        })
    }

    async updatePage(id: UUID, data: Partial<NotebookPage>): Promise<NotebookPage | null> {
        await this.pageRepo.update({ id }, data)
        return this.getPage(id)
    }

    async deletePage(id: UUID): Promise<boolean> {
        try {
            await this.pageRepo.delete({ id })
        } catch {
            return false
        }
        return true

    }

    async movePage(pageId: UUID, direction: 'up' | 'down'): Promise<void> {
        const page = await this.pageRepo.findOne({ where: { id: pageId }, relations: ['section'] });
        if (!page) throw new Error('Page not found');

        const sectionId = page.section.id;

        // Trova la pagina "vicina" da swappare
        const neighbor = await this.pageRepo.createQueryBuilder('p')
            .where('p.section_id = :sectionId', { sectionId })
            .andWhere(direction === 'up' ? 'p.order < :order' : 'p.order > :order', { order: page.order })
            .orderBy('p.order', direction === 'up' ? 'DESC' : 'ASC')
            .getOne()

        if (!neighbor) return; // già in cima/fondo

        // Swap degli order
        const tmp = page.order;
        page.order = neighbor.order;
        neighbor.order = tmp;

        await this.pageRepo.save([page, neighbor]);
    }

    async reorderPages(sectionId: UUID, orderedIds: UUID[]): Promise<void> {
        for (let i = 0; i < orderedIds.length; i++) {
            await this.pageRepo.update({ id: orderedIds[i], section: { id: sectionId } }, { order: i })
        }
    }

    async findBySection(sectionId: UUID): Promise<NotebookPage[]> {
        return this.pageRepo.find({
            where: { section: { id: sectionId } },
            relations: { section: true },
            order: { order: 'ASC' }
        })
    }




}

