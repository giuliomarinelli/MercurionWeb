import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LabNotebook } from '../../Models/entities/lab-notebook/lab-notebook.entity';
import { UUID } from 'crypto';

@Injectable()
export class LabNotebookService {
    constructor(
        @InjectRepository(LabNotebook)
        private readonly notebookRepo: Repository<LabNotebook>,
    ) { }

    async create(userId: UUID, data: { title: string }): Promise<LabNotebook> {
        const notebook = this.notebookRepo.create({
            ...data,
            userId,
            createdAt: Date.now(),
        })
        return await this.notebookRepo.save(notebook);
    }

    async findById(id: UUID): Promise<LabNotebook | null> {
        return this.notebookRepo.findOne({ where: { id }, relations: ['chapters'] })
    }

    async listByUser(userId: UUID): Promise<LabNotebook[]> {
        return this.notebookRepo.find({ where: { userId }, order: { createdAt: 'DESC' } })
    }

    async update(id: UUID, data: Partial<LabNotebook>): Promise<LabNotebook | null> {
        await this.notebookRepo.update({ id }, data)
        return this.findById(id)
    }

    async delete(id: UUID): Promise<void> {
        await this.notebookRepo.delete({ id })
    }
}
