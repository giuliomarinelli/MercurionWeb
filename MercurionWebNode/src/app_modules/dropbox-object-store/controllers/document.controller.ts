import { StorageAction } from './../Models/enums/storage-action.type';
import {
    Controller, Post, Get, Delete, Param, Req, Res,
    HttpStatus, InternalServerErrorException,
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
import { StorageScope } from '../Models/enums/storage-scope.enum';
import { TypeGuards } from 'src/utils/type-guards/type-guards';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';

@Controller('documents')
export class DocumentController {

    private readonly logger: MeiliContextLogger;

    constructor(
        private readonly dropboxService: DropboxObjectStoreService,
        meiliLogger: MeiliLoggerService
    ) {
        this.logger = meiliLogger.forContext(DocumentController.name)
    }

    /** Upload (multipart/form-data) */
    @Post('upload')
    async upload(
        @Req() req: FastifyRequest,
        @Res({ passthrough: true }) res: FastifyReply,
        @AuthenticatedUserId() userId: string,
    ) {

        const ALLOWED_MIME = new Set<string>([
            'application/pdf',
            'text/csv',
            'chemical/x-mdl-sdfile',
            'image/png',
            'image/jpeg'
        ])

        const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MiB


        /* ① parser */
        const form = formidable({
            maxFileSize: MAX_FILE_SIZE,
            allowEmptyFiles: false,
            multiples: false,
            filter: ({ name, mimetype }) => name === 'file' && !!mimetype
        })

        /* ② parse()  → wrapper Promise per tipi corretti */
        const [fields, files]: [Fields, Files] = await new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            form.parse(req.raw, (err, flds, fls) => (err ? reject(err) : resolve([flds, fls])));
        });

        /* ③ estrai il file (campo “file”) */
        const uploaded = (files as Record<string, FormFile | FormFile[]>).file;
        const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;

        if (!file) {
            res.status(HttpStatus.BAD_REQUEST).send({ error: 'file mancante nel form-data' })
            return
        }

        if (!ALLOWED_MIME.has(file.mimetype ?? '')) {
            res.status(HttpStatus.BAD_REQUEST).send({ error: 'Tipo di file non consentito' })
            return
        }

        if (file.size > MAX_FILE_SIZE) {
            res.status(HttpStatus.BAD_REQUEST).send({ error: 'File troppo grande' })
            return
        }


        /* ④ buffer in RAM (oppure lavora a stream via file.filepath) */
        const buffer = await fs.readFile(file.filepath);

        const noteRaw = fields.note;
        const isPublicRaw = fields.isPublic;
        const scopeRaw = fields.scope
        const actionRaw = fields.action

        const MAX_NOTE_LEN = 1000

        let note: string | null = Array.isArray(noteRaw) ? noteRaw[0] : noteRaw
        if (typeof note === 'string') {
            note = note.slice(0, MAX_NOTE_LEN)
        } else {
            note = null
        }

        const isPublic = Array.isArray(isPublicRaw) ? isPublicRaw[0] === 'true' : isPublicRaw === 'true';
        const scope = (Array.isArray(scopeRaw) ? scopeRaw[0] : scopeRaw) || StorageScope.None
        const actionUnk = (Array.isArray(actionRaw) ? actionRaw[0] : actionRaw)
        let action: StorageAction = null
        if (TypeGuards.isStorageAction(actionUnk)) {
            action = actionUnk
        }
        if (!TypeGuards.isEnumValue(StorageScope, scope)) {
            const allowedValues = Object.keys(StorageScope)
            res.status(HttpStatus.BAD_REQUEST)
                .send({
                    error: `Invalid scope. Allowed values = [${allowedValues.join(', ')}]`
                })
            return
        }

        try {
            /* ⑤ salva su Dropbox */
            const saved: DocumentEntity = await this.dropboxService.uploadFile(
                buffer,
                file.originalFilename ?? 'upload.bin',
                file.mimetype ?? 'application/octet-stream',
                file.size,
                userId as UUID,   // usa il vero userId passato dal metadata
                note ?? '',
                isPublic,
                true,
                scope,
                action
            );
            res.status(HttpStatus.CREATED).send(saved);
        } catch (e) {
            this.logger.warn('Upload error:', e)
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: 'Upload failed' })
        } finally {
            await fs.unlink(file.filepath).catch(() => null)
        }
    }

    /** Scarica un documento */
    @Get(':id/download')
    async download(
        @Param('id') id: string,
        @AuthenticatedUserId() userId: string,
        @Res({ passthrough: true }) res: FastifyReply,
    ) {
        const document = await this.dropboxService.getDocumentById(id as UUID)
        if (!document) {
            res.status(HttpStatus.NOT_FOUND).send({ message: 'File not found' })
            return;
        }
        try {
            const buffer = await this.dropboxService.downloadFile(id as UUID, userId as UUID)
            res.header('Content-Type', document.mimeType)
            res.header('Content-Disposition', `attachment; filename="${document.originalName}"`)
            res.send(buffer)
        } catch (err) {
            this.logger.error('Download error:', err)
            throw new InternalServerErrorException('Download failed')
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
