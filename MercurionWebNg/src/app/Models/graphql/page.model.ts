export interface PageModel<T> {
  items: T[];
  totalPages: number;
  totalItems: number;
  currentPage: number
}
