import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResponse } from 'src/app/theme/shared/models/response.model';
import { environment } from 'src/environments/environment';
import { CreateProduction, ProductionResult } from '../models/production.model';

@Injectable({ providedIn: 'root' })
export class ProductionService {
  private http = inject(HttpClient);

  run(payload: CreateProduction) {
    return this.http.post<ApiResponse<ProductionResult>>(
      `${environment.apiUrl}/production`,
      payload,
    );
  }
}
