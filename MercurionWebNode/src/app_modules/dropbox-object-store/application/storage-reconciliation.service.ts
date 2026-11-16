import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { uuidv7 } from '@kripod/uuidv7'
import type { UUID } from 'crypto'
import { EntityManager, LessThan, Repository } from 'typeorm'
import { UnitOfWork } from 'src/persistence/transaction-context'
import { ObjectStore } from './object-store.port'
import { DocumentEntity } from '../models/entities/document.entity'
import { StorageOperationEntity } from '../models/entities/storage-operation.entity'
import { StorageOperationStatus } from '../models/enums/storage-operation-status.enum'
import { StorageOperationType } from '../models/enums/storage-operation-type.enum'

const MAX_ATTEMPTS = 8
const CLAIM_TIMEOUT_MS = 5 * 60_000

@Injectable()
export class StorageReconciliationService {
  private readonly logger = new Logger(StorageReconciliationService.name)
  private readonly workerId = `storage-${uuidv7()}`

  constructor(
    private readonly objectStore: ObjectStore,
    private readonly unitOfWork: UnitOfWork,
    @InjectRepository(StorageOperationEntity) private readonly operations: Repository<StorageOperationEntity>,
    @InjectRepository(DocumentEntity) private readonly documents: Repository<DocumentEntity>,
  ) {}

  async enqueue(
    input: {
      documentId?: UUID | null
      objectKey: string
      type: StorageOperationType
      dedupeKey: string
    },
  ): Promise<void> {
    const work = async (_context: unknown, entityManager: EntityManager) => {
      const repo = entityManager.getRepository(StorageOperationEntity)
      const existing = await repo.findOne({ where: { dedupeKey: input.dedupeKey } })
      if (existing && existing.status !== StorageOperationStatus.Completed) return
      await repo.save(repo.create({
        id: uuidv7() as import('crypto').UUID,
        documentId: input.documentId ?? null,
        objectKey: input.objectKey,
        type: input.type,
        status: StorageOperationStatus.Pending,
        attemptCount: 0,
        nextAttemptAt: String(Date.now()),
        createdAt: String(Date.now()),
        completedAt: null,
        lastError: null,
        dedupeKey: input.dedupeKey,
      }))
    }
    await this.unitOfWork.run(work as never)
  }

  async reconcile(limit = 25): Promise<{ processed: number; repaired: number; failed: number }> {
    await this.operations.update(
      { status: StorageOperationStatus.Processing, nextAttemptAt: LessThan(String(Date.now() - CLAIM_TIMEOUT_MS)) },
      { status: StorageOperationStatus.Failed },
    )
    const due = await this.operations.find({
      where: [
        { status: StorageOperationStatus.Pending },
        { status: StorageOperationStatus.Failed },
      ],
      order: { nextAttemptAt: 'ASC' },
      take: limit,
    })
    let repaired = 0
    let failed = 0
    for (const operation of due) {
      const claimed = await this.claim(operation.id)
      if (!claimed) continue
      try {
        await this.objectStore.delete({ key: operation.objectKey })
        await this.unitOfWork.run(async (_context, manager) => {
          const repo = manager.getRepository(StorageOperationEntity)
          await repo.update(operation.id, {
            status: StorageOperationStatus.Completed,
            completedAt: String(Date.now()),
            lastError: null,
          })
          if (operation.type === StorageOperationType.DeleteObject && operation.documentId) {
            await manager.getRepository(DocumentEntity).delete({ id: operation.documentId })
          }
        })
        repaired++
      } catch (error) {
        failed++
        await this.recordFailure(operation.id, error)
      }
    }
    const storageKeys = new Set((await this.objectStore.list?.() ?? []).map((reference) => reference.key))
    const activeDocuments = await this.documents.find({ where: { isActive: true } })
    const knownKeys = new Set(activeDocuments.map((document) => document.storagePath))
    this.logger.log(`storage reconciliation processed=${due.length} repaired=${repaired} failed=${failed} orphanObjects=${[...storageKeys].filter((key) => !knownKeys.has(key)).length}`)
    return { processed: due.length, repaired, failed }
  }

  private async claim(id: import('crypto').UUID): Promise<boolean> {
    const result = await this.operations.update(
      [{ id, status: StorageOperationStatus.Pending }, { id, status: StorageOperationStatus.Failed }],
      { status: StorageOperationStatus.Processing, nextAttemptAt: String(Date.now()), lastError: null, },
    )
    return result.affected === 1
  }

  private async recordFailure(id: import('crypto').UUID, error: unknown): Promise<void> {
    const operation = await this.operations.findOneBy({ id })
    if (!operation) return
    const attempts = operation.attemptCount + 1
    const terminal = attempts >= MAX_ATTEMPTS
    await this.operations.update(id, {
      attemptCount: attempts,
      status: terminal ? StorageOperationStatus.Terminal : StorageOperationStatus.Failed,
      nextAttemptAt: String(Date.now() + Math.min(60 * 60_000, 1000 * 2 ** attempts)),
      lastError: error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000),
    })
    this.logger.error(`storage operation ${id} ${terminal ? 'terminal' : 'retryable'} failure`, error)
  }
}
