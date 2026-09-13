export type { PageModel } from '@mercurion/rest-contracts'

export type PagePaginationState = {
  mode: 'page';
  currentPage: number;
  totalPages: number;
  pending: boolean;
  error?: string;
}

export type InfinitePaginationState = {
  mode: 'infinite';
  hasMore: boolean;
  pending: boolean;
  empty?: boolean;
  error?: string;
}

export type PaginationState = PagePaginationState | InfinitePaginationState
