export interface FlatPagination<T> {
    items: T[]
    itemCount: number
    totalItems: number
    itemsPerPage: number
    totalPages: number
    currentPage: number
}

