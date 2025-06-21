// src/app_modules/dropbox-object-store/controllers/document.controller.ts
import {
    Controller, Post, Get, Delete, Param, Req, Res,
    Logger, HttpStatus, InternalServerErrorException,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { promises as fs } from 'node:fs';              // fs/promises

import formidable, {
    Fields,
    Files,
    File as FormFile,                                   // alias per chiarezza
} from 'formidable';

import { UUID } from 'crypto';
import { DropboxObjectStoreService } from '../services/dropbox-object-store.service';
import { DocumentEntity } from '../Models/entities/document.entity';
import { AuthenticatedUserId } from 'src/metadata/metadata';

@Controller('documents')
export class DocumentController {

    private readonly logger = new Logger(DocumentController.name);

    constructor(private readonly dropboxService: DropboxObjectStoreService) { }

    /** Upload (multipart/form-data) */
    @Post('upload')
    async upload(
        @Req() req: FastifyRequest,
        @Res({ passthrough: true }) res: FastifyReply,
        @AuthenticatedUserId() userId: string,
    ) {
        /* ① parser */
        const form = formidable({
            maxFileSize: 50 * 1024 * 1024,  // 50 MB
            allowEmptyFiles: false,
            multiples: false,
        });     

        /* ② parse()  → wrapper Promise per tipi corretti */
        const [fields, files]: [Fields, Files] = await new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            form.parse(req.raw, (err, flds, fls) => (err ? reject(err) : resolve([flds, fls])));
        });

        /* ③ estrai il file (campo “file”) */
        const uploaded = (files as Record<string, FormFile | FormFile[]>).file;
        const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;

        if (!file) {
            res
                .status(HttpStatus.BAD_REQUEST)
                .send({ error: 'file mancante nel form-data' });
            return;
        }

        /* ④ buffer in RAM (oppure lavora a stream via file.filepath) */
        const buffer = await fs.readFile(file.filepath);

        const noteRaw = fields.note;
        const isPublicRaw = fields.isPublic;

        const note = Array.isArray(noteRaw) ? noteRaw[0] : noteRaw;
        const isPublic =
            Array.isArray(isPublicRaw) ? isPublicRaw[0] === 'true' : isPublicRaw === 'true';

        /* ⑤ salva su Dropbox */
        const saved: DocumentEntity = await this.dropboxService.uploadFile(
            buffer,
            file.originalFilename ?? 'upload.bin',
            file.mimetype ?? 'application/octet-stream',
            file.size,
            userId as unknown as UUID,   // usa il vero userId passato dal metadata
            note,
            isPublic,
        );

        res.status(HttpStatus.CREATED).send(saved);
    }

    /** Scarica un documento */
    @Get(':id/download')
    async download(
        @Param('id') id: string,
        @AuthenticatedUserId() userId: string,
        @Res({ passthrough: true }) res: FastifyReply,
    ) {
        const document = await this.dropboxService.getDocumentById(id as UUID);
        if (!document) {
            res.status(HttpStatus.NOT_FOUND).send({ message: 'File not found' });
            return;
        }
        try {
            const buffer = await this.dropboxService.downloadFile(id as UUID, userId as UUID);
            res.header('Content-Type', document.mimeType);
            res.header('Content-Disposition', `attachment; filename="${document.originalName}"`);
            res.send(buffer);
        } catch (err) {
            this.logger.error('Download error:', err);
            throw new InternalServerErrorException('Download failed');
        }
    }

    /** Elimina un documento */
    @Delete(':id')
    async delete(
        @Param('id') id: string,
        @AuthenticatedUserId() userId: string,
    ): Promise<{ success: boolean }> {
        await this.dropboxService.deleteFile(id as UUID, userId as UUID);
        return { success: true };
    }

    /** Lista dei documenti dell’utente */
    @Get('list')
    async list(@AuthenticatedUserId() userId: string) {
        if (!userId) throw new Error('userId required');
        return this.dropboxService.listDocuments(userId as UUID);
    }
}
