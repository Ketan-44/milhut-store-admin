import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResponse } from 'src/app/theme/shared/models/response.model';
import {
  PaginatedResult,
  PaginationQuery,
} from 'src/app/theme/shared/models/pagination.model';
import { appendPaginationParams } from 'src/app/theme/shared/utils/pagination-params.util';
import { environment } from 'src/environments/environment';
import { CreateSale, Transaction } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private http = inject(HttpClient);

  get(query: PaginationQuery = {}) {
    const params = this.buildParams(query);

    return this.http.get<ApiResponse<PaginatedResult<Transaction>>>(
      `${environment.apiUrl}/transaction`,
      { params },
    );
  }

  getById(id: string) {
    return this.http.get<ApiResponse<Transaction>>(
      `${environment.apiUrl}/transaction/${id}`,
    );
  }

  createSale(sale: CreateSale) {
    return this.http.post<ApiResponse<Transaction>>(
      `${environment.apiUrl}/transaction/sale`,
      sale,
    );
  }

  private buildParams(query: PaginationQuery): HttpParams {
    return appendPaginationParams(new HttpParams(), query);
  }
}
