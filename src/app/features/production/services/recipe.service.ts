import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResponse } from 'src/app/theme/shared/models/response.model';
import { environment } from 'src/environments/environment';
import { CreateRecipe, Recipe } from '../models/recipe.model';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private http = inject(HttpClient);

  get() {
    return this.http.get<ApiResponse<Recipe[]>>(
      `${environment.apiUrl}/recipe`,
    );
  }

  create(recipe: CreateRecipe) {
    return this.http.post<ApiResponse<Recipe>>(
      `${environment.apiUrl}/recipe`,
      recipe,
    );
  }
}
