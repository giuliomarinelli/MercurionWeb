import { UUID } from 'crypto'
import { DataSource, EntityManager } from 'typeorm'
import { NotebookDomainService } from './notebook-domain.service'
import { NotebookSection } from './entities/notebook-section.entity'
import { LabNotebook } from './entities/lab-notebook.entity'

describe('NotebookDomainService - owner isolation and reorder', () => {
  const owner = '019a68d0-72fa-71a3-a1e8-a34fc1c23712' as UUID
  const parentId = '019a68d0-72fb-72a3-98df-c9cdf14e17a4' as UUID
  const a = '019a68d0-72fc-78c6-ad3d-a2e2f32a875a' as UUID
  const b = '019a68d0-72fd-7f09-a620-f04bd7d4ca9b' as UUID

  it('rejects a section whose notebook parent belongs to another owner', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue({
        id: a, userId: owner, notebookId: parentId
      }),
      exists: jest.fn().mockResolvedValue(false)
    }
    const service = new NotebookDomainService({} as DataSource)

    await expect(service.ownedSection(manager as unknown as EntityManager, owner, a))
      .rejects.toThrow('NOTEBOOK_SECTION_NOT_FOUND')
    expect(manager.exists).toHaveBeenCalledWith(LabNotebook, {
      where: { id: parentId, userId: owner }
    })
  })

  it('rejects reorder attempts containing IDs outside the exact sibling set', async () => {
    const manager = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('FROM public.lab_notebooks')) return [{ id: parentId }]
        if (sql.includes('FROM public.lab_notebook_sections')) return [{ id: a }, { id: b }]
        return []
      })
    }
    const dataSource = {
      transaction: jest.fn(async (work: (manager: unknown) => Promise<unknown>) => work(manager))
    }
    const service = new NotebookDomainService(dataSource as unknown as DataSource)

    await expect(service.reorderSections(owner, parentId, [a])).rejects
      .toThrow('NOTEBOOK_REORDER_INVALID_SIBLINGS')
    expect(manager.query.mock.calls.every(call =>
      !String(call[0]).startsWith('UPDATE public.'))).toBe(true)
  })

  it('reorders a complete owned sibling set using the deferrable unique constraint', async () => {
    const sql: Array<{ statement: string; params?: unknown[] }> = []
    const manager = {
      query: jest.fn(async (statement: string, params?: unknown[]) => {
        sql.push({ statement, params })
        if (statement.includes('FROM public.lab_notebooks')) return [{ id: parentId }]
        if (statement.includes('FROM public.lab_notebook_sections')) return [{ id: a }, { id: b }]
        return []
      })
    }
    const dataSource = {
      transaction: jest.fn(async (work: (manager: unknown) => Promise<unknown>) => work(manager))
    }
    const service = new NotebookDomainService(dataSource as unknown as DataSource)

    await expect(service.reorderSections(owner, parentId, [b, a])).resolves.toBe(true)

    expect(sql.some(call =>
      call.statement === 'SET CONSTRAINTS uq_notebook_section_order DEFERRED')).toBe(true)
    const updates = sql.filter(call => call.statement.startsWith('UPDATE public.lab_notebook_sections'))
    expect(updates).toHaveLength(2)
    expect(updates[0].params?.[0]).toBe(0)
    expect(updates[0].params?.[2]).toBe(b)
    expect(updates[1].params?.[0]).toBe(1)
    expect(updates[1].params?.[2]).toBe(a)
  })

  it('rejects duplicate reorder IDs before opening a transaction', async () => {
    const dataSource = { transaction: jest.fn() }
    const service = new NotebookDomainService(dataSource as unknown as DataSource)
    await expect(service.reorderSections(owner, parentId, [a, a])).rejects
      .toThrow('NOTEBOOK_REORDER_DUPLICATES')
    expect(dataSource.transaction).not.toHaveBeenCalled()
  })
})
