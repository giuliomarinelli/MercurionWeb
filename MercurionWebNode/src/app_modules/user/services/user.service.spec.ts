import { UserService } from './user.service';

describe('UserService', () => {
  const userId = '00000000-0000-0000-0000-000000000001' as any;

  function createService(manager: any, transaction?: (work: (manager: any) => Promise<unknown>) => Promise<unknown>) {
    const dataSource = {
      transaction: jest.fn(transaction ?? (async (work) => work(manager))),
    } as any;
    const loggerMock = { warn: jest.fn() };
    return {
      service: new UserService(
      {} as any,
      dataSource,
      {} as any,
      {} as any,
      {} as any,
      { forContext: jest.fn().mockReturnValue(loggerMock) } as any,
      ),
      dataSource,
    };
  }

  it('should be defined', () => {
    const { service } = createService({});
    expect(service).toBeDefined();
  });

  it('updates and reads the user back through the transaction manager', async () => {
    const updatedUser = { id: userId, firstName: 'Updated' };
    const manager = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn().mockResolvedValue(updatedUser),
    };
    const { service, dataSource } = createService(manager);

    await expect(service.updateUser(userId, { firstName: 'Updated' } as any))
      .resolves.toBe(updatedUser);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.update).toHaveBeenCalledWith(expect.anything(), { id: userId }, { firstName: 'Updated' });
    expect(manager.findOne).toHaveBeenCalledWith(expect.anything(), { where: { id: userId } });
  });

  it('returns null for an update with no matching user', async () => {
    const manager = {
      update: jest.fn().mockResolvedValue({ affected: 0 }),
      findOne: jest.fn(),
    };
    const { service } = createService(manager);

    await expect(service.updateUser(userId, { firstName: 'Updated' } as any)).resolves.toBeNull();
    expect(manager.findOne).not.toHaveBeenCalled();
  });

  it('propagates update failures so the transaction boundary can roll back', async () => {
    const failure = new Error('write failed');
    const manager = {
      update: jest.fn().mockRejectedValue(failure),
      findOne: jest.fn(),
    };
    const lifecycle: string[] = [];
    const { service, dataSource } = createService(manager, async (work) => {
      lifecycle.push('begin');
      try {
        return await work(manager);
      } catch (error) {
        lifecycle.push('rollback');
        throw error;
      } finally {
        lifecycle.push('released');
      }
    });

    await expect(service.updateUser(userId, { firstName: 'Updated' } as any)).rejects.toBe(failure);
    expect(lifecycle).toEqual(['begin', 'rollback', 'released']);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('propagates read-back failures and does not expose a partial update', async () => {
    const failure = new Error('read failed');
    const manager = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn().mockRejectedValue(failure),
    };
    const lifecycle: string[] = [];
    const { service } = createService(manager, async (work) => {
      lifecycle.push('begin');
      try {
        return await work(manager);
      } catch (error) {
        lifecycle.push('rollback');
        throw error;
      } finally {
        lifecycle.push('released');
      }
    });

    await expect(service.updateUser(userId, { firstName: 'Updated' } as any)).rejects.toBe(failure);
    expect(lifecycle).toEqual(['begin', 'rollback', 'released']);
  });

  it('rolls back when the updated row disappears before read-back', async () => {
    const manager = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn().mockResolvedValue(null),
    };
    const lifecycle: string[] = [];
    const { service } = createService(manager, async (work) => {
      lifecycle.push('begin');
      try {
        return await work(manager);
      } catch (error) {
        lifecycle.push('rollback');
        throw error;
      } finally {
        lifecycle.push('released');
      }
    });

    await expect(service.updateUser(userId, { firstName: 'Updated' } as any))
      .rejects.toThrow('disappeared during transactional update read-back');
    expect(lifecycle).toEqual(['begin', 'rollback', 'released']);
  });
});
