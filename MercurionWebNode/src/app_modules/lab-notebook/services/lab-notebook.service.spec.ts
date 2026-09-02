import { LabNotebookService } from './lab-notebook.service';
import { Repository } from 'typeorm';
import { LabNotebook } from '../Models/entities/lab-notebook.entity';

// PATCH: fieldsMap è sempre oggetto
const EMPTY_FIELDS_MAP = {};
const NOTEBOOK_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = '00000000-0000-0000-0000-000000000002';

function createNotebookFixture(title: string): LabNotebook {
  const notebook = new LabNotebook();
  notebook.id = NOTEBOOK_ID;
  notebook.userId = USER_ID;
  notebook.title = title;
  notebook.chapters = [];
  notebook.createdAt = null;
  notebook.updatedAt = null;
  return notebook;
}

describe('LabNotebookService', () => {
  let service: LabNotebookService;
  let repo: jest.Mocked<Repository<LabNotebook>>;
  let createMock: jest.Mock;
  let saveMock: jest.Mock;
  let findOneMock: jest.Mock;
  let findMock: jest.Mock;
  let updateMock: jest.Mock;
  let deleteMock: jest.Mock;
  let createQueryBuilderMock: jest.Mock;

  beforeEach(() => {
    createMock = jest.fn();
    saveMock = jest.fn();
    findOneMock = jest.fn();
    findMock = jest.fn();
    updateMock = jest.fn();
    deleteMock = jest.fn();
    createQueryBuilderMock = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
    }));
    repo = {
      create: createMock,
      save: saveMock,
      findOne: findOneMock,
      find: findMock,
      update: updateMock,
      delete: deleteMock,
      createQueryBuilder: createQueryBuilderMock,
    } as unknown as jest.Mocked<Repository<LabNotebook>>;
    service = new LabNotebookService(repo);
  });

  describe('create', () => {
    it('creates and returns an empty notebook', async () => {
      const created = createNotebookFixture('title');
      createMock.mockReturnValue(created);
      saveMock.mockResolvedValue({ ...created });

      const result = await service.create(USER_ID, 'title');

      expect(createMock).toHaveBeenCalledWith({ userId: USER_ID, title: 'title' });
      expect(saveMock).toHaveBeenCalledWith(created);
      expect(result).toEqual({ ...created, chapters: [] });
    });
  });

  describe('findOne', () => {
    it('returns null when not found', async () => {
      // mock QueryBuilder chain
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      createQueryBuilderMock.mockReturnValue(qb);

      const res = await service.findOne(NOTEBOOK_ID, USER_ID, EMPTY_FIELDS_MAP);
      expect(res).toBeNull();
    });

    it('normalizes nested arrays', async () => {
      const notebook: any = { chapters: [{ sections: [{}] }] };
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(notebook),
      };
      createQueryBuilderMock.mockReturnValue(qb);

      const res = await service.findOne(NOTEBOOK_ID, USER_ID, EMPTY_FIELDS_MAP);
      expect(res?.chapters[0].sections[0].pages).toEqual([]);
    });
  });

  describe('findAllByUser', () => {
    it('fills missing chapter arrays', async () => {
      const n = { chapters: undefined } as unknown as LabNotebook;
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([n]),
      };
      createQueryBuilderMock.mockReturnValue(qb);

      const res = await service.findAllByUser(USER_ID, EMPTY_FIELDS_MAP);
      expect(res[0].chapters).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates and returns the entity', async () => {
      const createdNotebook = createNotebookFixture('t');
      updateMock.mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] });
      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue(createdNotebook);
      const res = await service.update(NOTEBOOK_ID, USER_ID, { title: 't' }, EMPTY_FIELDS_MAP);
      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(updateMock.mock.calls[0]?.[0]).toEqual({ id: NOTEBOOK_ID, userId: USER_ID });
      expect(updateMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ title: 't' }));
      expect(updateMock.mock.calls[0]?.[1]?.updatedAt).toEqual(expect.any(Number));
      expect(findOneSpy).toHaveBeenCalledWith(NOTEBOOK_ID, USER_ID, EMPTY_FIELDS_MAP);
      expect(res).toBe(createdNotebook);
    });
  });

  describe('delete', () => {
    it('returns true on success', async () => {
      deleteMock.mockResolvedValue({ affected: 1, raw: [] });
      await expect(service.delete(NOTEBOOK_ID, USER_ID)).resolves.toBe(true);
    });

    it('returns false on failure', async () => {
      deleteMock.mockRejectedValue(new Error('fail'));
      await expect(service.delete(NOTEBOOK_ID, USER_ID)).resolves.toBe(false);
    });
  });
});
