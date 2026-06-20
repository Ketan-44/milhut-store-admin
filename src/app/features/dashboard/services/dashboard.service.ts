import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResponse } from 'src/app/theme/shared/models/response.model';
import { PaginatedResult, PaginationQuery } from 'src/app/theme/shared/models/pagination.model';
import { appendPaginationParams } from 'src/app/theme/shared/utils/pagination-params.util';
import { environment } from 'src/environments/environment';
import { Transaction } from '../../transactions/models/transaction.model';
import {
  DashboardDateRangeQuery,
  DashboardProductionQuery,
  DashboardStatsResult,
  LiveInventoryResult,
} from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getLiveInventory(query: PaginationQuery = {}) {
    return this.http.get<ApiResponse<LiveInventoryResult>>(
      `${environment.apiUrl}/dashboard/live-inventory`,
      { params: this.buildParams(query) },
    );
  }

  getStats(query: DashboardDateRangeQuery = {}) {
    return this.http.get<ApiResponse<DashboardStatsResult>>(
      `${environment.apiUrl}/dashboard/stats`,
      { params: this.buildParams(query) },
    );
  }

  getPurchasedInventory(query: DashboardDateRangeQuery = {}) {
    return this.http.get<ApiResponse<PaginatedResult<Transaction>>>(
      `${environment.apiUrl}/dashboard/purchased-inventory`,
      { params: this.buildParams(query) },
    );
  }

  getProduction(query: DashboardProductionQuery = {}) {
    return this.http.get<ApiResponse<PaginatedResult<Transaction>>>(
      `${environment.apiUrl}/dashboard/production`,
      { params: this.buildParams(query) },
    );
  }

  getSales(query: DashboardDateRangeQuery = {}) {
    return this.http.get<ApiResponse<PaginatedResult<Transaction>>>(
      `${environment.apiUrl}/dashboard/sales`,
      { params: this.buildParams(query) },
    );
  }

  private buildParams(
    query: (PaginationQuery | DashboardDateRangeQuery) & {
      productId?: string;
      sourceBatchId?: string;
    },
  ): HttpParams {
    let params = new HttpParams();

    if ('startDate' in query && query.startDate) {
      params = params.set('startDate', query.startDate);
    }

    if ('endDate' in query && query.endDate) {
      params = params.set('endDate', query.endDate);
    }

    if ('productId' in query && query.productId) {
      params = params.set('productId', query.productId);
    }

    if ('sourceBatchId' in query && query.sourceBatchId) {
      params = params.set('sourceBatchId', query.sourceBatchId);
    }

    return appendPaginationParams(params, query);
  }
}
