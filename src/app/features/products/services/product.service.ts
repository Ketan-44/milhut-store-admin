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
import { CreateProduct, Product, UpdateProduct } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  get(query: PaginationQuery = {}) {
    const params = this.buildParams(query);

    return this.http.get<ApiResponse<PaginatedResult<Product>>>(
      `${environment.apiUrl}/product`,
      { params },
    );
  }

  async getAllItems(): Promise<Product[]> {
    return this.fetchAllPages((page, limit) => this.get({ page, limit }));
  }

  getById(id: string) {
    return this.http.get<ApiResponse<Product>>(
      `${environment.apiUrl}/product/${id}`,
    );
  }

  create(product: CreateProduct) {
    return this.http.post<ApiResponse<Product>>(
      `${environment.apiUrl}/product`,
      product,
    );
  }

  update(id: string, product: UpdateProduct) {
    return this.http.patch<ApiResponse<Product>>(
      `${environment.apiUrl}/product/${id}`,
      product,
    );
  }

  delete(id: string) {
    return this.http.delete<ApiResponse<{ message: string }>>(
      `${environment.apiUrl}/product/${id}`,
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
