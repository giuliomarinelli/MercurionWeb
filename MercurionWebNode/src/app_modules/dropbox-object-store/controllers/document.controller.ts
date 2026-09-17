import { Controller, Delete, Get, HttpStatus, Param, Post, Req, Res } from '@nestjs/common'
import type { UUID } from 'crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { AuthenticatedUserId } from 'src/metadata/metadata'
import { DocumentCommandService } from '../application/document-command.service'
import { parseDocumentUpload } from '../transport/document-upload.adapter'

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentCommands: DocumentCommandService) {}

  @Post('upload')
  async upload(
    @AuthenticatedUserId() userId: string,
    // transport-only: raw request access is isolated by the multipart upload adapter.
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    const command = await parseDocumentUpload(request)
    try {
      const input = {
        body: command.file.open(),
        originalName: command.file.originalName,
        mimeType: command.file.mimeType,
        size: command.file.size,
        ownerUserId: userId as UUID,
        note: command.metadata.note,
        isPublic: command.metadata.isPublic,
        scope: command.metadata.scope,
      }
      const document = command.metadata.action === 'ChangeProfileImage'
        ? await this.documentCommands.replaceProfileImage(input)
        : await this.documentCommands.upload(input)
      reply.status(HttpStatus.CREATED).send(publicDocument(document))
    } finally {
      await command.file.cleanup()
    }
  }

  @Get(':id')
  async download(
    @Param('id') id: string,
    @AuthenticatedUserId() userId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    const result = await this.documentCommands.download({
      documentId: id as UUID,
      requestingUserId: userId as UUID,
    })
    reply
      .header('Content-Type', result.document.mimeType)
      .header('Content-Disposition', `attachment; filename="${result.document.originalName}"`)
      .send(result.content)
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @AuthenticatedUserId() userId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.documentCommands.delete({
      documentId: id as UUID,
      requestingUserId: userId as UUID,
    })
    reply.status(HttpStatus.NO_CONTENT).send()
  }

  @Get()
  async list(
    @AuthenticatedUserId() userId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    const documents = await this.documentCommands.list(userId as UUID)
    reply.send(documents.map(publicDocument))
  }
}

function publicDocument(document: {
  id: UUID
  originalName: string
  size: number
  mimeType: string
  note: string | null
  isPublic: boolean
  scope: string
  isActive: boolean
  createdAt: number
  updatedAt: number
}) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    mimeType: document.mimeType,
    note: document.note,
    isPublic: document.isPublic,
    scope: document.scope,
    isActive: document.isActive,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  }
}
