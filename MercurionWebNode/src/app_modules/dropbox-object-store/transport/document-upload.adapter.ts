import { BadRequestException } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { promises as fs } from 'node:fs'
import { createReadStream } from 'node:fs'
import type { ReadStream } from 'node:fs'
import type { FastifyRequest } from 'fastify'
import {
  kFileSavedPaths,
  type File as FormidableFile,
  type Files
} from 'fastify-formidable'
import {
  DOCUMENT_UPLOAD_ALLOWED_MIME_TYPES,
  DOCUMENT_UPLOAD_FILE_FIELD,
  DOCUMENT_UPLOAD_MAX_FILE_SIZE,
  type DocumentUploadMimeType
} from './document-upload.policy'
import { DocumentUploadMetadataDto } from './document-upload.dto'

export interface DocumentUploadFile {
  readonly originalName: string
  readonly mimeType: DocumentUploadMimeType
  readonly size: number
  readonly path: string
  open(): ReadStream
  cleanup(): Promise<void>
}

export interface DocumentUploadCommand {
  readonly metadata: DocumentUploadMetadataDto
  readonly file: DocumentUploadFile
}

function oneFile(files: Files): FormidableFile {
  const candidate = files[DOCUMENT_UPLOAD_FILE_FIELD]
  if (!candidate || Array.isArray(candidate)) {
    throw new BadRequestException(
      Array.isArray(candidate) ? 'Only one file is permitted' : 'A file is required'
    )
  }
  return candidate
}

async function validateMetadata(fields: Record<string, unknown>): Promise<DocumentUploadMetadataDto> {
  const metadata = plainToInstance(DocumentUploadMetadataDto, fields)
  const errors = await validate(metadata, {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true
  })
  if (errors.length > 0) {
    throw new BadRequestException('Invalid upload metadata')
  }
  return metadata
}

export async function parseDocumentUpload(
  request: FastifyRequest
): Promise<DocumentUploadCommand> {
  let files: Files | null = null
  try {
    const fields = await request.parseMultipart<Record<string, unknown>>({
      maxFileSize: DOCUMENT_UPLOAD_MAX_FILE_SIZE,
      maxFiles: 1,
      allowEmptyFiles: false,
      multiples: true,
      filter: ({ name, mimetype }) =>
        name === DOCUMENT_UPLOAD_FILE_FIELD &&
        typeof mimetype === 'string' &&
        DOCUMENT_UPLOAD_ALLOWED_MIME_TYPES.includes(mimetype as DocumentUploadMimeType)
    })
    files = request.files
    const file = oneFile(files ?? {})

    if (!DOCUMENT_UPLOAD_ALLOWED_MIME_TYPES.includes(file.mimetype as DocumentUploadMimeType)) {
      throw new BadRequestException('Unsupported file type')
    }
    if (file.size > DOCUMENT_UPLOAD_MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds the maximum size')
    }

    const metadataFields = Object.fromEntries(
      Object.entries(fields).filter(([name]) => name !== DOCUMENT_UPLOAD_FILE_FIELD)
    )
    const metadata = await validateMetadata(metadataFields)
    const path = file.filepath
    return {
      metadata,
      file: {
        originalName: file.originalFilename ?? 'upload.bin',
        mimeType: file.mimetype as DocumentUploadMimeType,
        size: file.size,
        path,
        open: () => createReadStream(path),
        cleanup: () => fs.rm(path, { force: true })
      }
    }
  } catch (error) {
    const parsedFiles = files ?? request.files
    const paths = [
      ...(request[kFileSavedPaths] ?? []),
      ...(parsedFiles
      ? Object.values(parsedFiles).flatMap(value =>
          (Array.isArray(value) ? value : [value]).map(file => file.filepath)
        )
      : [])
    ]
    await Promise.all(paths.map(path => fs.rm(path, { force: true })))
    if (error instanceof BadRequestException) throw error
    throw new BadRequestException('Invalid multipart upload')
  }
}
