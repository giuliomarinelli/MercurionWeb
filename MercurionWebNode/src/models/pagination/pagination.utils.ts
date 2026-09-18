import type { Pagination } from 'nestjs-typeorm-paginate'
import type { FlatPagination } from 'src/models/flat-pagination.interface'

export function toFlatPagination<T>(
  pagination: Pagination<T> | FlatPagination<T>,
): FlatPagination<T> {
  if ('meta' in pagination) {
    const { items, meta } = pagination
    return {
      items,
      itemCount: meta.itemCount,
      totalItems: meta.totalItems ?? -1,
      itemsPerPage: meta.itemsPerPage,
      totalPages: meta.totalPages ?? -1,
      currentPage: meta.currentPage,
    }
  }

  return pagination
}
