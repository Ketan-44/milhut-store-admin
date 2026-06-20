import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiResponse } from 'src/app/theme/shared/models/response.model';
import {
  PaginatedResult,
  PaginationQuery,
} from 'src/app/theme/shared/models/pagination.model';
import { appendPaginationParams } from 'src/app/theme/shared/utils/pagination-params.util';
import { environment } from 'src/environments/environment';
import {
  BatchLookup,
  CreateInventory,
  Inventory,
  UpdateInventory,
} from '../models/inventory.model';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);

  get(query: PaginationQuery = {}) {
    const params = this.buildParams(query);

    return this.http.get<ApiResponse<PaginatedResult<Inventory>>>(
      `${environment.apiUrl}/inventory`,
      { params },
    );
  }

  async getAllItems(): Promise<Inventory[]> {
    return this.fetchAllPages((page, limit) => this.get({ page, limit }));
  }

  getById(id: string) {
    return this.http.get<ApiResponse<BatchLookup>>(
      `${environment.apiUrl}/inventory/${id}`,
    );
  }

  create(inventory: CreateInventory) {
    return this.http.post<ApiResponse<Inventory>>(
      `${environment.apiUrl}/inventory`,
      inventory,
    );
  }

  update(id: string, inventory: UpdateInventory) {
    return this.http.patch<ApiResponse<BatchLookup>>(
      `${environment.apiUrl}/inventory/${id}`,
      inventory,
    );
  }

  delete(id: string) {
    return this.http.delete<ApiResponse<{ message: string }>>(
      `${environment.apiUrl}/inventory/${id}`,
    );
  }

  getByBatchNumber(batchNumber: string) {
    return this.http.get<ApiResponse<BatchLookup>>(
      `${environment.apiUrl}/inventory/batch/${encodeURIComponent(batchNumber)}`,
    );
  }

  private buildParams(query: PaginationQuery): HttpParams {
    return appendPaginationParams(new HttpParams(), query);
  }

  private async fetchAllPages<T>(
    fetchPage: (page: number, limit: number) => ReturnType<typeof this.get>,
  ): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const response = await firstValueFrom(fetchPage(page, limit));
      items.push(...(response.data.items as T[]));

      if (page >= response.data.meta.totalPages) {
        break;
      }

      page += 1;
    }

    return items;
  }
}
