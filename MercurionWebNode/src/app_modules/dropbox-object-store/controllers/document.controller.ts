import { Controller, Post, Get, Delete, Param, Query, Req, Res, Logger, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { UUID } from 'crypto';
import Busboy from 'busboy';
import { DropboxObjectStoreService } from '../services/dropbox-object-store.service';
import { DocumentEntity } from '../Models/entities/document.entity';
import type { BusboyConfig, Busboy as BusboyType } from 'busboy';



@Controller('documents')
export class DocumentController {
    private readonly logger = new Logger(DocumentController.name);

    constructor(private readonly dropboxService: DropboxObjectStoreService) { }

    @Post('upload')
    async upload(
        @Req() req: FastifyRequest,
        @Res({ passthrough: true }) res: FastifyReply,
        @Query('userId') userId: string
    ) {
        if (!userId) {
            res.status(HttpStatus.BAD_REQUEST).send({ error: 'userId required' });
            return;
        }

        const busboy: BusboyType = Busboy({ headers: req.headers } as BusboyConfig)
        let fileBuffer = Buffer.alloc(0);
        let originalName = '';
        let mimeType = '';
        let size = 0;
        let note: string | undefined = undefined;
        let isPublic = false;

        let errorOccured = false;

        busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
            originalName = filename as string
            mimeType = mimetype as string
            file.on('data', (data) => {
                size += data.length;
                fileBuffer = Buffer.concat([fileBuffer, data]);
            });
        });

        busboy.on('field', (fieldname, val) => {
            if (fieldname === 'note') note = val as string;
            if (fieldname === 'isPublic') isPublic = val === 'true' || val === '1';
        });

        busboy.on('finish', async () => {
            if (!fileBuffer.length) {
                errorOccured = true;
                res.status(HttpStatus.BAD_REQUEST).send({ error: 'File missing' });
                return;
            }
            try {
                // CORRETTO: Tipizza il risultato
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
                throw new InternalServerErrorException('Upload failed')
            }
        });

        req.raw.pipe(busboy);

        req.raw.on('error', (err) => {
            if (!errorOccured) {
                this.logger.error('Stream error:', err);
                throw new InternalServerErrorException('Stream error')
            }
        })
    }

    @Get(':id/download')
    async download(
        @Param('id') id: string,
        @Query('user_id') userId: string,
        @Res({ passthrough: true }) res: FastifyReply
    ) {
        // Recupera documento tramite metodo service (no property access!)
        const document = await this.dropboxService.getDocumentById(id as UUID);
        if (!document) {
            res.status(HttpStatus.NOT_FOUND).send({ message: 'File not found' });
            return;
        }

        try {
            const buffer = await this.dropboxService.downloadFile(id as UUID, userId as UUID)
            res.header('Content-Type', document.mimeType)
            res.header('Content-Disposition', `attachment; filename="${document.originalName}"`)
            res.send(buffer)
        } catch (err) {
            this.logger.error('Download error:', err);
            throw new InternalServerErrorException('Download failed')
        }
    }

    @Delete(':id')
    async delete(
        @Param('id') id: string,
        @Query('user_id') userId: string
    ): Promise<{ success: boolean }> {
        await this.dropboxService.deleteFile(id as UUID, userId as UUID)
        return { success: true }
    }

    @Get('list')
    async list(@Query('userId') userId: string) {
        if (!userId) throw new Error('userId required')
        return await this.dropboxService.listDocuments(userId as UUID)
    }
}
