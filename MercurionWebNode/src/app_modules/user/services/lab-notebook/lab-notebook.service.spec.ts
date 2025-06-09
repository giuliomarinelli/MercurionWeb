import { LabNotebookService } from './lab-notebook.service';
import { Repository } from 'typeorm';
import { LabNotebook } from '../../Models/entities/lab-notebook/lab-notebook.entity';

describe('LabNotebookService', () => {
  let service: LabNotebookService;
  let repo: jest.Mocked<Repository<LabNotebook>>;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;
    service = new LabNotebookService(repo);
  });

  describe('create', () => {
    it('creates and returns an empty notebook', async () => {
      const created = { id: '1' } as any;
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue({ ...created });

      const result = await service.create('user' as any, 'title');

      expect(repo.create).toHaveBeenCalledWith({ userId: 'user', title: 'title' });
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual({ ...created, chapters: [] });
    });
  });

  describe('findOne', () => {
    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      const res = await service.findOne('id' as any, 'user' as any);
      expect(res).toBeNull();
    });

    it('normalizes nested arrays', async () => {
      const notebook: any = { chapters: [{ sections: [{}] }] };
      repo.findOne.mockResolvedValue(notebook);
      const res = await service.findOne('id' as any, 'user' as any);
      expect(res?.chapters[0].sections[0].pages).toEqual([]);
    });
  });

  describe('findAllByUser', () => {
    it('fills missing chapter arrays', async () => {
      const n = { chapters: undefined } as any;
      repo.find.mockResolvedValue([n]);
      const res = await service.findAllByUser('user' as any);
      expect(res[0].chapters).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates and returns the entity', async () => {
      repo.update.mockResolvedValue(undefined as any);
      jest.spyOn(service, 'findOne').mockResolvedValue('note' as any);
      const res = await service.update('1' as any, 'user' as any, { title: 't' });
      expect(repo.update).toHaveBeenCalledWith(
        { id: '1' },
        expect.objectContaining({ title: 't', updatedAt: expect.any(Number) })
      );
      expect(res).toBe('note');
    });
  });

  describe('delete', () => {
    it('returns true on success', async () => {
      repo.delete.mockResolvedValue(undefined as any);
      await expect(service.delete('1' as any, 'user' as any)).resolves.toBe(true);
    });

    it('returns false on failure', async () => {
      repo.delete.mockRejectedValue(new Error('fail'));
      await expect(service.delete('1' as any, 'user' as any)).resolves.toBe(false);
    });
  });
});
