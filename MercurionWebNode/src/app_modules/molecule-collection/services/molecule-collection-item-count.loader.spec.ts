import { UUID } from 'crypto';
import { MoleculeCollectionItemCountLoader } from './molecule-collection-item-count.loader';

const userId = '01900000-0000-7000-8000-000000000001' as UUID;

function createQueryBuilder(rows: Array<{ collectionId: UUID; count: string }>) {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
  return queryBuilder;
}

function createLoader(
  rows: Array<{ collectionId: UUID; count: string }>,
) {
  const queryBuilder = createQueryBuilder(rows);
  const repository = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
  };
  const loader = new MoleculeCollectionItemCountLoader(repository as never);
  return { loader, repository, queryBuilder };
}

describe('MoleculeCollectionItemCountLoader', () => {
  it.each([1, 10, 100])(
    'uses one grouped query for %i requested collections',
    async (collectionCount) => {
      const collections = Array.from(
        { length: collectionCount },
        (_, index) =>
          `01900000-0000-7000-8000-${String(index + 2).padStart(12, '0')}` as UUID,
      );
      const { loader, repository, queryBuilder } = createLoader([
        { collectionId: collections[0], count: '2' },
      ]);

      const counts = await Promise.all(
        collections.map((collectionId) => loader.load(userId, collectionId)),
      );

      expect(counts[0]).toBe(2);
      expect(counts.slice(1).every((count) => count === 0)).toBe(true);
      expect(repository.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(queryBuilder.groupBy).toHaveBeenCalledWith('join.collectionId');
    },
  );

  it('deduplicates the same user and collection within the request', async () => {
    const collectionId = '01900000-0000-7000-8000-000000000002' as UUID;
    const { loader, repository } = createLoader([{ collectionId, count: '3' }]);

    const first = loader.load(userId, collectionId);
    const second = loader.load(userId, collectionId);

    expect(first).toBe(second);
    await expect(Promise.all([first, second])).resolves.toEqual([3, 3]);
    expect(repository.createQueryBuilder).toHaveBeenCalledTimes(1);
  });

  it('keeps users structurally isolated and returns zero for absent groups', async () => {
    const collectionId = '01900000-0000-7000-8000-000000000002' as UUID;
    const otherUserId = '01900000-0000-7000-8000-000000000003' as UUID;
    const { loader, repository, queryBuilder } = createLoader([]);

    await expect(
      Promise.all([
        loader.load(userId, collectionId),
        loader.load(otherUserId, collectionId),
      ]),
    ).resolves.toEqual([0, 0]);
    expect(repository.createQueryBuilder).toHaveBeenCalledTimes(2);
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'join.userId = :userId',
      expect.objectContaining({ userId }),
    );
  });
});
