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
import { CreateRecipe, Recipe, UpdateRecipe } from '../models/recipe.model';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private http = inject(HttpClient);

  get(query: PaginationQuery = {}) {
    const params = this.buildParams(query);

    return this.http.get<ApiResponse<PaginatedResult<Recipe>>>(
      `${environment.apiUrl}/recipe`,
      { params },
    );
  }

  async getAllItems(): Promise<Recipe[]> {
    return this.fetchAllPages((page, limit) => this.get({ page, limit }));
  }

  getById(id: string) {
    return this.http.get<ApiResponse<Recipe>>(
      `${environment.apiUrl}/recipe/${id}`,
    );
  }

  create(recipe: CreateRecipe) {
    return this.http.post<ApiResponse<Recipe>>(
      `${environment.apiUrl}/recipe`,
      recipe,
    );
  }

  update(id: string, recipe: UpdateRecipe) {
    return this.http.patch<ApiResponse<Recipe>>(
      `${environment.apiUrl}/recipe/${id}`,
      recipe,
    );
  }

  delete(id: string) {
    return this.http.delete<ApiResponse<{ message: string }>>(
      `${environment.apiUrl}/recipe/${id}`,
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
