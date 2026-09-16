import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { UUID } from 'crypto'
import { Repository } from 'typeorm'
import type { EntityManager } from 'typeorm'
import { User } from 'src/app_modules/user/models/entities/user.entity'
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { UnitOfWork, afterTransactionCommit } from 'src/persistence/transaction-context'
import { DocumentEntity } from '../models/entities/document.entity'
import { StorageScope } from '../models/enums/storage-scope.enum'
import { StorageType } from '../models/enums/storage-type.enum'
import { ObjectStore } from './object-store.port'
import { StorageOperationEntity } from '../models/entities/storage-operation.entity'
import { StorageOperationType } from '../models/enums/storage-operation-type.enum'
import { StorageOperationStatus } from '../models/enums/storage-operation-status.enum'
import { uuidv7 } from '@kripod/uuidv7'
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
    @InjectRepository(StorageOperationEntity) private readonly operations: Repository<StorageOperationEntity> = null as never,
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
      try {
        await this.objectStore.delete(object.reference)
      } catch {
        await this.enqueueCleanup(object.reference.key)
      }
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
          previous.isActive = false
          await documents.save(previous)
          await this.enqueueInTransaction(manager, {
            documentId: previous.id,
            objectKey: previous.storagePath,
            type: StorageOperationType.DeleteObject,
            dedupeKey: `delete:${previous.id}`,
          })
          afterTransactionCommit(_context, () => this.processPendingOperation(previous.id))
        }
        return document
      })
    } catch (cause) {
      try {
        await this.objectStore.delete(object.reference)
      } catch {
        await this.enqueueCleanup(object.reference.key)
      }
      throw cause
    }
  }

  async download(input: DownloadDocumentInput): Promise<{ document: DocumentEntity; content: Buffer }> {
    const document = await this.documents.findOneBy({ id: input.documentId })
    if (!document) throw applicationError(ApplicationErrorCode.DROPBOX_DOCUMENT_NOT_FOUND)
    if (!document.isPublic && document.userId !== input.requestingUserId) {
      throw applicationError(ApplicationErrorCode.DROPBOX_DOCUMENT_ACCESS_DENIED)
    }
    if (!document.isActive) throw applicationError(ApplicationErrorCode.DROPBOX_DOCUMENT_NOT_FOUND)
    return { document, content: await this.objectStore.get({ key: document.storagePath }) }
  }

  async delete(input: DeleteDocumentInput): Promise<void> {
    const document = await this.documents.findOneBy({ id: input.documentId })
    if (!document) throw applicationError(ApplicationErrorCode.DROPBOX_DOCUMENT_NOT_FOUND)
    if (document.userId !== input.requestingUserId) {
      throw applicationError(ApplicationErrorCode.DROPBOX_DOCUMENT_ACCESS_DENIED)
    }
    await this.unitOfWork.run(async (_context, manager) => {
      const repo = manager.getRepository(DocumentEntity)
      document.isActive = false
      await repo.save(document)
      await this.enqueueInTransaction(manager, {
        documentId: document.id,
        objectKey: document.storagePath,
        type: StorageOperationType.DeleteObject,
        dedupeKey: `delete:${document.id}`,
      })
    })
    await this.processPendingOperation(document.id)
  }

  list(ownerUserId: UUID): Promise<DocumentEntity[]> {
    return this.documents.find({ where: { userId: ownerUserId, isActive: true }, order: { createdAt: 'DESC' } })
  }

  private async enqueueCleanup(objectKey: string): Promise<void> {
    if (!this.operations) return
    await this.operations.insert({
      id: uuidv7() as UUID,
      documentId: null,
      objectKey,
      type: StorageOperationType.CleanupUpload,
      status: StorageOperationStatus.Pending,
      attemptCount: 0,
      nextAttemptAt: String(Date.now()),
      createdAt: String(Date.now()),
      completedAt: null,
      lastError: null,
      dedupeKey: `cleanup:${objectKey}`,
    })
  }

  private async enqueueInTransaction(
    manager: EntityManager,
    input: {
      documentId: UUID
      objectKey: string
      type: StorageOperationType
      dedupeKey: string
    },
  ): Promise<void> {
    const repo = manager.getRepository(StorageOperationEntity)
    const existing = await repo.findOne({ where: { dedupeKey: input.dedupeKey } })
    if (!existing) {
      await repo.save(repo.create({
        id: uuidv7() as UUID,
        ...input,
        status: StorageOperationStatus.Pending,
        attemptCount: 0,
        nextAttemptAt: String(Date.now()),
        createdAt: String(Date.now()),
        completedAt: null,
        lastError: null,
      }))
    }
  }

  private async processPendingOperation(documentId: UUID): Promise<void> {
    const operation = await this.operations.findOne({ where: { documentId, status: StorageOperationStatus.Pending } })
    if (!operation) return
    try {
      await this.objectStore.delete({ key: operation.objectKey })
      await this.unitOfWork.run(async (_context, manager) => {
        await manager.getRepository(StorageOperationEntity).update(operation.id, {
          status: StorageOperationStatus.Completed,
          completedAt: String(Date.now()),
        })
        await manager.getRepository(DocumentEntity).delete({ id: documentId })
      })
    } catch (error) {
      await this.operations.update(operation.id, {
        status: StorageOperationStatus.Failed,
        attemptCount: operation.attemptCount + 1,
        nextAttemptAt: String(Date.now() + 1000),
        lastError: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
