import { firstValueFrom, Observable } from 'rxjs';
import { PaginatedResult } from '../models/pagination.model';
import { PAGE_LIMIT_OPTIONS } from '../constants/pagination.constants';

const MAX_PAGE_SIZE = PAGE_LIMIT_OPTIONS[PAGE_LIMIT_OPTIONS.length - 1];

export async function fetchAllPaginatedItems<T>(
  fetchPage: (page: number, limit: number) => Observable<PaginatedResult<T>>,
  pageSize = MAX_PAGE_SIZE,
): Promise<T[]> {
  const firstResponse = await firstValueFrom(fetchPage(1, pageSize));
  const items = [...firstResponse.items];

  if (firstResponse.meta.totalPages <= 1) {
    return items;
  }

  const remainingPages = Array.from(
    { length: firstResponse.meta.totalPages - 1 },
    (_, index) => firstValueFrom(fetchPage(index + 2, pageSize)),
  );
  const responses = await Promise.all(remainingPages);

  for (const response of responses) {
    items.push(...response.items);
  }

  return items;
}
