import { StorageReconciliationService } from './storage-reconciliation.service'
import { StorageOperationStatus } from '../models/enums/storage-operation-status.enum'
import { StorageOperationType } from '../models/enums/storage-operation-type.enum'

describe('StorageReconciliationService', () => {
  it('repairs a pending deletion and removes its inactive metadata', async () => {
    const operation = {
      id: '00000000-0000-0000-0000-000000000001',
      documentId: '00000000-0000-0000-0000-000000000002',
      objectKey: 'id:old',
      type: StorageOperationType.DeleteObject,
      status: StorageOperationStatus.Pending,
      attemptCount: 0,
      nextAttemptAt: String(Date.now()),
    }
    const operations = {
      find: jest.fn().mockResolvedValue([operation]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOneBy: jest.fn().mockResolvedValue(operation),
    }
    const documents = {
      find: jest.fn().mockResolvedValue([]),
    }
    const objectStore = {
      delete: jest.fn().mockResolvedValue(undefined),
      list: jest.fn().mockResolvedValue([]),
    }
    const unitOfWork = {
      run: jest.fn(async (work: (context: unknown, manager: unknown) => Promise<unknown>) => work({}, {
        getRepository: (target: unknown) => target ? {
          update: operations.update,
          delete: jest.fn().mockResolvedValue(undefined),
        } : undefined,
      })),
    }
    const service = new StorageReconciliationService(
      objectStore as never,
      unitOfWork as never,
      operations as never,
      documents as never,
    )

    await expect(service.reconcile()).resolves.toMatchObject({ processed: 1, repaired: 1, failed: 0 })
    expect(objectStore.delete).toHaveBeenCalledWith({ key: 'id:old' })
    expect(operations.update).toHaveBeenCalledWith(operation.id, expect.objectContaining({
      status: StorageOperationStatus.Completed,
    }))
  })

  it('records retryable provider failures without losing the intent', async () => {
    const operation = {
      id: '00000000-0000-0000-0000-000000000001',
      documentId: null,
      objectKey: 'id:retry',
      type: StorageOperationType.CleanupUpload,
      status: StorageOperationStatus.Pending,
      attemptCount: 0,
      nextAttemptAt: String(Date.now()),
    }
    const operations = {
      find: jest.fn().mockResolvedValue([operation]),
      update: jest.fn()
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValue({ affected: 1 }),
      findOneBy: jest.fn().mockResolvedValue(operation),
    }
    const objectStore = {
      delete: jest.fn().mockRejectedValue(new Error('provider timeout')),
      list: jest.fn().mockResolvedValue([]),
    }
    const service = new StorageReconciliationService(
      objectStore as never,
      {} as never,
      operations as never,
      { find: jest.fn().mockResolvedValue([]) } as never,
    )

    await expect(service.reconcile()).resolves.toMatchObject({ processed: 1, repaired: 0, failed: 1 })
    expect(operations.update).toHaveBeenLastCalledWith(operation.id, expect.objectContaining({
      status: StorageOperationStatus.Failed,
      attemptCount: 1,
      lastError: 'provider timeout',
    }))
  })
})
