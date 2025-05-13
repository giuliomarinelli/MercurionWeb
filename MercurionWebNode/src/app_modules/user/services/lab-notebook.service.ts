import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LabNotebookEntry } from '../Models/entities/lab-notbook-entry.entity';
import { Repository } from 'typeorm';
import { CreateNoteDto } from '../Models/DTO/create-note.cls.dto';
import { UUID } from 'crypto';
import { UpdateNoteDto } from '../Models/DTO/update-note.cls.dto';

@Injectable()
export class LabNotebookService {

    constructor(
        @InjectRepository(LabNotebookEntry)
        private readonly notebookRepo: Repository<LabNotebookEntry>
    ) { }

    async createNote(dto: CreateNoteDto) {
        const note = this.notebookRepo.create(dto)
        return this.notebookRepo.save(note)
    }

    async getUserNotes(userId: UUID) {
        return this.notebookRepo.find({ where: { userId }, relations: { links: true } })
    }

    async updateNote(noteId: UUID, dto: UpdateNoteDto) {
        await this.notebookRepo.update(noteId, { ...dto })
        return this.notebookRepo.findOneByOrFail({ id: noteId })
    }




}
