import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, ValidationPipe } from '@nestjs/common';
import { LabNotebookService } from '../services/lab-notebook.service';
import { CreateNoteDto } from '../Models/DTO/create-note.cls.dto';
import { UUID } from 'crypto';
import { UpdateNoteDto } from '../Models/DTO/update-note.cls.dto';



@Controller('notebook')
export class LabNotebookController {

    constructor(
        private readonly notebookService: LabNotebookService
    ) { }

    @Post()
    async create(@Body(new ValidationPipe({ transform: true })) dto: CreateNoteDto) {
        return this.notebookService.createNote(dto)
    }

    @Get('user/:userId')
    async getUserNotes(@Param('userId') userId: UUID) {
        return this.notebookService.getUserNotes(userId)
    }

    @Get(':id')
    async getById(@Param('id') id: UUID) {
        return this.notebookService.getNoteById(id)
    }

    @Patch(':id')
    async update(
        @Param('id') id: UUID,
        @Body(new ValidationPipe({ transform: true })) dto: UpdateNoteDto
    ) {
        return this.notebookService.updateNote(id, dto)
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id') id: UUID): Promise<void> {
        await this.notebookService.deleteNote(id)
    }
}
