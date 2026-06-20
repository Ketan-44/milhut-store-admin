import { HttpParams } from '@angular/common/http';
import { PaginationQuery } from '../models/pagination.model';

export function appendPaginationParams(
  params: HttpParams,
  query: PaginationQuery,
): HttpParams {
  if (query.page) {
    params = params.set('page', String(query.page));
  }

  if (query.limit) {
    params = params.set('limit', String(query.limit));
  }

  if (query.search?.trim()) {
    params = params.set('search', query.search.trim());
  }

  if (query.sortBy) {
    params = params.set('sortBy', query.sortBy);
  }

  if (query.sortOrder) {
    params = params.set('sortOrder', query.sortOrder);
  }

  return params;
}
