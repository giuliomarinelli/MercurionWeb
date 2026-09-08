import { Controller, Delete, Get, HttpStatus, Post, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Controller('documents')
export class DocumentController {
    /**
     * These endpoints are deliberately retained as disabled API placeholders.
     * The document API is not implemented yet and must not expose the dormant
     * Dropbox storage service through an accidental public contract.
     */

    @Post()
    upload(@Res({ passthrough: true }) res: FastifyReply): void {
        // TODO(SYS-018): Remove this 403 guard when the document upload API is implemented.
        res.status(HttpStatus.FORBIDDEN).send();
    }

    @Get(':id')
    download(@Res({ passthrough: true }) res: FastifyReply): void {
        // TODO(SYS-018): Remove this 403 guard when the document download API is implemented.
        res.status(HttpStatus.FORBIDDEN).send();
    }

    @Delete(':id')
    delete(@Res({ passthrough: true }) res: FastifyReply): void {
        // TODO(SYS-018): Remove this 403 guard when the document delete API is implemented.
        res.status(HttpStatus.FORBIDDEN).send();
    }

    @Get()
    list(@Res({ passthrough: true }) res: FastifyReply): void {
        // TODO(SYS-018): Remove this 403 guard when the document listing API is implemented.
        res.status(HttpStatus.FORBIDDEN).send();
    }
}
