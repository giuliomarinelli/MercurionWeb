import {
    Controller, Post, Get, Delete, Param, Req, Res, Logger, HttpStatus, InternalServerErrorException
} from '@nestjs/common';
import busboy from 'busboy';
import { FastifyRequest, FastifyReply } from 'fastify';
import { UUID } from 'crypto';
import { DropboxObjectStoreService } from '../services/dropbox-object-store.service';
import { DocumentEntity } from '../Models/entities/document.entity';
import { AuthenticatedUserId } from 'src/metadata/metadata';

@Controller('documents')
export class DocumentController {
    private readonly logger = new Logger(DocumentController.name);

    constructor(private readonly dropboxService: DropboxObjectStoreService) { }

    /**
     * Upload file (stream/multipart, Fastify 5 + busboy)
     */

@Post('upload')
async upload(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply, @AuthenticatedUserId() userId: string) {
    if (!userId) {
        res.status(HttpStatus.BAD_REQUEST).send({ error: 'userId required' });
        return;
    }

    // --- QUI il fix ---
    const bb = busboy({ headers: req.headers }); // <-- NOTA: SENZA `new` !
    // ------------------

    let fileBuffer = Buffer.alloc(0);
    let originalName = '';
    let mimeType = '';
    let size = 0;
    let note: string | undefined = undefined;
    let isPublic = false;
    let errorOccured = false;

    bb.on('file', (fieldname, file, filename, encoding, mimetype) => {
        originalName = filename as string
        mimeType = mimetype as string
        file.on('data', (data) => {
            size += data.length;
            fileBuffer = Buffer.concat([fileBuffer, data]);
        });
    });

    bb.on('field', (fieldname, val) => {
        if (fieldname === 'note') note = val as string;
        if (fieldname === 'isPublic') isPublic = val === 'true' || val === '1';
    });

    bb.on('finish', async () => {
        if (!fileBuffer.length) {
            errorOccured = true;
            res.status(HttpStatus.BAD_REQUEST).send({ error: 'File missing' });
            return;
        }
        try {
            const uploadResult: DocumentEntity = await this.dropboxService.uploadFile(
                fileBuffer,
                originalName,
                mimeType,
                size,
                userId as UUID,
                note,
                isPublic
            );
            res.status(HttpStatus.CREATED).send(uploadResult);
        } catch (err) {
            errorOccured = true;
            this.logger.error('Upload error:', err);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: 'Upload failed', details: err?.message || err });
        }
    });

    req.raw.pipe(bb);

    req.raw.on('error', (err) => {
        if (!errorOccured) {
            this.logger.error('Stream error:', err);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: 'Stream error', details: err?.message || err });
        }
    })
}


@Get(':id/download')
async download(
    @Param('id') id: string,
    @AuthenticatedUserId() userId: string,
    @Res({ passthrough: true }) res: FastifyReply
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

@Delete(':id')
async delete (
    @Param('id') id: string,
        @AuthenticatedUserId() userId: string
    ): Promise < { success: boolean } > {
    await this.dropboxService.deleteFile(id as UUID, userId as UUID);
    return { success: true };
}

@Get('list')
async list(@AuthenticatedUserId() userId: string) {
    if (!userId) throw new Error('userId required');
    return await this.dropboxService.listDocuments(userId as UUID);
}
}
