import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { LabNotebookEntry } from '../Models/entities/lab-notbook-entry.entity';
import { CreateNoteDto } from '../Models/DTO/create-note.cls.dto';
import { UpdateNoteDto } from '../Models/DTO/update-note.cls.dto';

@Injectable()
export class LabNotebookService {
    constructor(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        @InjectRepository(LabNotebookEntry)
        private readonly notebookRepo: Repository<LabNotebookEntry>
    ) { }

    async createNote(dto: CreateNoteDto): Promise<LabNotebookEntry> {
        const note = this.notebookRepo.create({ ...dto })
        return this.notebookRepo.save(note)
    }

    async getUserNotes(userId: UUID): Promise<LabNotebookEntry[]> {
        return this.notebookRepo.find({
            where: { userId },
            relations: {
                links: true
            },
            order: { createdAt: 'DESC' }
        })
    }

    async getNoteById(noteId: UUID): Promise<LabNotebookEntry> {
        return this.notebookRepo.findOneOrFail({
            where: { id: noteId },
            relations: {
                links: true
            }
        })
    }

    async updateNote(noteId: UUID, dto: UpdateNoteDto): Promise<LabNotebookEntry> {
        await this.notebookRepo.update(noteId, {
            ...dto
        })
        return this.getNoteById(noteId)
    }

    async deleteNote(noteId: UUID): Promise<void> {
        await this.notebookRepo.delete(noteId)
    }

}
