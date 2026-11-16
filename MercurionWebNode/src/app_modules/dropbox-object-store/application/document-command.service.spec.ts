import { DocumentCommandService } from './document-command.service'
import { StorageScope } from '../models/enums/storage-scope.enum'
import { DocumentEntity } from '../models/entities/document.entity'
import { User } from 'src/app_modules/user/models/entities/user.entity'

describe('DocumentCommandService', () => {
  const document = (overrides: Partial<DocumentEntity> = {}) => ({
    id: 'document-id',
    userId: 'owner-id',
    storagePath: 'provider-key',
    originalName: 'file.txt',
    size: 4,
    mimeType: 'text/plain',
    note: null,
    isPublic: false,
    scope: StorageScope.None,
    isActive: true,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }) as DocumentEntity

  it('uploads through the port and persists metadata', async () => {
    const objectStore = {
      put: jest.fn().mockResolvedValue({ reference: { key: 'provider-key' } }),
      get: jest.fn(),
      delete: jest.fn(),
    }
    const saved = document()
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        create: jest.fn().mockReturnValue(saved),
      }),
      save: jest.fn().mockResolvedValue(saved),
    }
    const service = new DocumentCommandService(
      objectStore,
      { run: jest.fn(async (work) => work({} as never, manager as never)) } as never,
      {} as never,
    )

    await expect(service.upload({
      body: Buffer.from('data'),
      originalName: 'file.txt',
      mimeType: 'text/plain',
      size: 4,
      ownerUserId: 'owner-id' as never,
    })).resolves.toBe(saved)
    expect(objectStore.put).toHaveBeenCalled()
    expect(manager.save).toHaveBeenCalledWith(DocumentEntity, saved)
  })

  it('checks public visibility before retrieving an object', async () => {
    const objectStore = { put: jest.fn(), get: jest.fn(), delete: jest.fn() }
    const documents = { findOneBy: jest.fn().mockResolvedValue(document()) }
    const service = new DocumentCommandService(objectStore, {} as never, documents as never)

    await expect(service.download({
      documentId: 'document-id' as never,
      requestingUserId: 'other-user' as never,
    })).rejects.toMatchObject({ code: 'DROPBOX_DOCUMENT_ACCESS_DENIED' })
    expect(objectStore.get).not.toHaveBeenCalled()
  })

  it('replaces the avatar through a dedicated command', async () => {
    const objectStore = {
      put: jest.fn().mockResolvedValue({ reference: { key: 'new-key' } }),
      get: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    }
    const user = { id: 'owner-id', avatar: null }
    const userRepo = { findOne: jest.fn().mockResolvedValue(user), save: jest.fn() }
    const docRepo = {
      create: jest.fn().mockReturnValue(document({ storagePath: 'new-key', scope: StorageScope.ProfileImage })),
      save: jest.fn(),
      delete: jest.fn(),
    }
    const manager = {
      getRepository: jest.fn((target) => target === User ? userRepo : docRepo),
    }
    const service = new DocumentCommandService(
      objectStore,
      { run: jest.fn(async (work) => work({} as never, manager as never)) } as never,
      {} as never,
    )

    await service.replaceProfileImage({
      body: Buffer.from('data'),
      originalName: 'avatar.png',
      mimeType: 'image/png',
      size: 4,
      ownerUserId: 'owner-id' as never,
      scope: StorageScope.ProfileImage,
    })
    expect(userRepo.save).toHaveBeenCalled()
    expect(docRepo.delete).not.toHaveBeenCalled()
  })
})
