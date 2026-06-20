import { SortOrder } from '../models/sort-order.enum';

export interface TableSortState {
  sortBy?: string;
  sortOrder?: SortOrder;
}

export function nextTableSort(
  state: TableSortState,
  column: string,
): TableSortState {
  if (state.sortBy !== column) {
    return { sortBy: column, sortOrder: SortOrder.ASC };
  }

  return {
    sortBy: column,
    sortOrder:
      state.sortOrder === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC,
  };
}

export function isSortActive(state: TableSortState, column: string): boolean {
  return state.sortBy === column;
}

export function isSortAsc(state: TableSortState, column: string): boolean {
  return state.sortBy === column && state.sortOrder === SortOrder.ASC;
}

export function isSortDesc(state: TableSortState, column: string): boolean {
  return state.sortBy === column && state.sortOrder === SortOrder.DESC;
}
