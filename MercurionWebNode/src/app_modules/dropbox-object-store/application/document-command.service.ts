import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { UUID } from 'crypto'
import { Repository } from 'typeorm'
import { User } from 'src/app_modules/user/models/entities/user.entity'
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { UnitOfWork, afterTransactionCommit } from 'src/persistence/transaction-context'
import { DocumentEntity } from '../models/entities/document.entity'
import { StorageScope } from '../models/enums/storage-scope.enum'
import { StorageType } from '../models/enums/storage-type.enum'
import { ObjectStore } from './object-store.port'
import type { Readable } from 'node:stream'

export interface UploadDocumentInput {
  readonly body: Buffer | Readable
  readonly originalName: string
  readonly mimeType: string
  readonly size: number
  readonly ownerUserId: UUID
  readonly note?: string
  readonly isPublic?: boolean
  readonly isActive?: boolean
  readonly scope?: StorageScope
}

export interface DownloadDocumentInput {
  readonly documentId: UUID
  readonly requestingUserId: UUID
}

export type DeleteDocumentInput = DownloadDocumentInput

@Injectable()
export class DocumentCommandService {
  constructor(
    private readonly objectStore: ObjectStore,
    private readonly unitOfWork: UnitOfWork,
    @InjectRepository(DocumentEntity) private readonly documents: Repository<DocumentEntity>,
  ) {}

  async upload(input: UploadDocumentInput): Promise<DocumentEntity> {
    const metadata = {
      contentType: input.mimeType || 'application/octet-stream',
      size: input.size,
      originalName: input.originalName,
    }
    const object = await this.objectStore.put({
      body: input.body,
      name: input.originalName,
      metadata,
    })
    try {
      return await this.unitOfWork.run(async (_context, manager) => {
        const document = manager.getRepository(DocumentEntity).create({
          userId: input.ownerUserId,
          storageType: StorageType.Dropbox,
          storagePath: object.reference.key,
          originalName: input.originalName,
          size: input.size,
          mimeType: metadata.contentType,
          note: input.note?.slice(0, 1000) ?? null,
          isPublic: input.isPublic ?? false,
          scope: input.scope ?? StorageScope.None,
          isActive: input.isActive ?? true,
          updatedAt: Date.now(),
        })
        await manager.save(DocumentEntity, document)
        return document
      })
    } catch (cause) {
      await this.objectStore.delete(object.reference).catch(() => undefined)
      throw cause
    }
  }

  async replaceProfileImage(input: UploadDocumentInput): Promise<DocumentEntity> {
    if (input.scope !== StorageScope.ProfileImage) {
      throw applicationError(ApplicationErrorCode.ACTION_NOT_ALLOWED)
    }
    const object = await this.objectStore.put({
      body: input.body,
      name: input.originalName,
      metadata: {
        contentType: input.mimeType || 'application/octet-stream',
        size: input.size,
        originalName: input.originalName,
      },
    })
    try {
      return await this.unitOfWork.run(async (_context, manager) => {
        const users = manager.getRepository(User)
        const documents = manager.getRepository(DocumentEntity)
        const user = await users.findOne({ where: { id: input.ownerUserId }, relations: { avatar: true } })
        if (!user) throw applicationError(ApplicationErrorCode.USER_NOT_FOUND)
        const previous = user.avatar
        const document = documents.create({
          userId: input.ownerUserId,
          storageType: StorageType.Dropbox,
          storagePath: object.reference.key,
          originalName: input.originalName,
          size: input.size,
          mimeType: input.mimeType || 'application/octet-stream',
          note: input.note?.slice(0, 1000) ?? null,
          isPublic: false,
          scope: StorageScope.ProfileImage,
          isActive: true,
          updatedAt: Date.now(),
        })
        await documents.save(document)
        user.avatar = document
        await users.save(user)
        if (previous) {
          await documents.delete({ id: previous.id })
          afterTransactionCommit(_context, () => this.objectStore.delete({ key: previous.storagePath }))
        }
        return document
      })
    } catch (cause) {
      await this.objectStore.delete(object.reference).catch(() => undefined)
      throw cause
    }
  }

  async download(input: DownloadDocumentInput): Promise<{ document: DocumentEntity; content: Buffer }> {
    const document = await this.documents.findOneBy({ id: input.documentId })
    if (!document) throw applicationError(ApplicationErrorCode.DROPBOX_DOCUMENT_NOT_FOUND)
    if (!document.isPublic && document.userId !== input.requestingUserId) {
      throw applicationError(ApplicationErrorCode.DROPBOX_DOCUMENT_ACCESS_DENIED)
    }
    return { document, content: await this.objectStore.get({ key: document.storagePath }) }
  }

  async delete(input: DeleteDocumentInput): Promise<void> {
    const document = await this.documents.findOneBy({ id: input.documentId })
    if (!document) throw applicationError(ApplicationErrorCode.DROPBOX_DOCUMENT_NOT_FOUND)
    if (document.userId !== input.requestingUserId) {
      throw applicationError(ApplicationErrorCode.DROPBOX_DOCUMENT_ACCESS_DENIED)
    }
    await this.objectStore.delete({ key: document.storagePath })
    try {
      await this.documents.delete({ id: document.id })
    } catch (cause) {
      throw applicationError(ApplicationErrorCode.DROPBOX_DELETE_DATABASE_SYNC_FAILED, undefined, undefined, cause)
    }
  }

  list(ownerUserId: UUID): Promise<DocumentEntity[]> {
    return this.documents.find({ where: { userId: ownerUserId }, order: { createdAt: 'DESC' } })
  }
}
