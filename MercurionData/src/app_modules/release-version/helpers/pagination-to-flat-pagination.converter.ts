import { Pagination } from "nestjs-typeorm-paginate"
import { FlatPagination } from "../Models/DTO/flat-pagination.dto"

export function paginationToFlatPaginationConverter<T>(pagination: Pagination<T>): FlatPagination<T> {
        const { items, meta } = pagination
        const { currentPage, itemsPerPage, itemCount, totalItems, totalPages } = meta
        return {
            items,
            itemCount,
            itemsPerPage,
            currentPage,
            totalPages: totalPages ?? -1,
            totalItems: totalItems ?? -1
        }
    }