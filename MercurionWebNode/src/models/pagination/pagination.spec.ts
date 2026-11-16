import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { PaginationArgs, PAGINATION_DEFAULT_LIMIT, PAGINATION_DEFAULT_PAGE, PAGINATION_MAX_LIMIT } from './pagination.args'
import { toFlatPagination } from './pagination.utils'

describe('pagination contract', () => {
  it.each([
    [{}, true, PAGINATION_DEFAULT_PAGE, PAGINATION_DEFAULT_LIMIT],
    [{ page: 1, limit: 1 }, true, 1, 1],
    [{ page: 3, limit: PAGINATION_MAX_LIMIT }, true, 3, PAGINATION_MAX_LIMIT],
    [{ page: 0, limit: 20 }, false, 0, 20],
    [{ page: 1, limit: 0 }, false, 1, 0],
    [{ page: 1, limit: PAGINATION_MAX_LIMIT + 1 }, false, 1, PAGINATION_MAX_LIMIT + 1],
    [{ page: 1.5, limit: 20 }, false, 1.5, 20],
  ])('validates page=%j', async (input, valid, page, limit) => {
    const args = plainToInstance(PaginationArgs, input)
    const errors = await validate(args)

    expect(args.page).toBe(page)
    expect(args.limit).toBe(limit)
    expect(errors.length === 0).toBe(valid)
  })

  it('normalizes typeorm pagination metadata without changing the public flat shape', () => {
    expect(toFlatPagination({
      items: ['first'],
      meta: {
        itemCount: 1,
        totalItems: 1,
        itemsPerPage: 20,
        totalPages: 1,
        currentPage: 1,
      },
    })).toEqual({
      items: ['first'],
      itemCount: 1,
      totalItems: 1,
      itemsPerPage: 20,
      totalPages: 1,
      currentPage: 1,
    })
  })
})
