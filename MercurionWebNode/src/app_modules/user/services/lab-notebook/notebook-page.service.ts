import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotebookPage } from '../../Models/entities/lab-notebook/lab-notebook-page.entity';
import { UUID } from 'crypto';


@Injectable()
export class NotebookPageService {
    constructor(
        @InjectRepository(NotebookPage)
        private readonly pageRepo: Repository<NotebookPage>,
    ) { }

    async createPage(data: Partial<NotebookPage>): Promise<NotebookPage> {
        // Qui puoi aggiungere logica per impostare order = max+1 tra le pagine della stessa sezione
        const page = this.pageRepo.create(data)
        return await this.pageRepo.save(page)
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

    async deletePage(id: UUID): Promise<void> {
        await this.pageRepo.delete({ id })
    }

    // Altri metodi: riordino, batch update, etc.
}
