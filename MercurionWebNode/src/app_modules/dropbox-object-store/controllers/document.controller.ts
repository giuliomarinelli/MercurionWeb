import { Controller, Delete, Get, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { UUID } from 'crypto'
import { AuthenticatedUserId } from 'src/metadata/metadata'
import { DropboxObjectStoreService } from '../services/dropbox-object-store.service'
import { parseDocumentUpload } from '../transport/document-upload.adapter'

@Controller('documents')
export class DocumentController {
    constructor(private readonly dropboxService: DropboxObjectStoreService) {}

    @Post('upload')
    async upload(
        @AuthenticatedUserId() userId: string,
        @Req() request: FastifyRequest,
        @Res({ passthrough: true }) reply: FastifyReply
    ): Promise<void> {
        const command = await parseDocumentUpload(request)
        try {
            const document = await this.dropboxService.uploadFile(
                command.file.open(),
                command.file.originalName,
                command.file.mimeType,
                command.file.size,
                userId as UUID,
                command.metadata.note,
                command.metadata.isPublic,
                true,
                command.metadata.scope,
                command.metadata.action
            )
            reply.status(201).send(document)
        } finally {
            await command.file.cleanup()
        }
    }

    @Get(':id')
    download(@Res({ passthrough: true }) reply: FastifyReply): void {
        reply.status(HttpStatus.FORBIDDEN).send()
    }

    @Delete(':id')
    delete(@Res({ passthrough: true }) reply: FastifyReply): void {
        reply.status(HttpStatus.FORBIDDEN).send()
    }

    @Get()
    list(@Res({ passthrough: true }) reply: FastifyReply): void {
        reply.status(HttpStatus.FORBIDDEN).send()
    }
}
