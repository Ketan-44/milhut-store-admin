import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResponse } from 'src/app/theme/shared/models/response.model';
import { environment } from 'src/environments/environment';
import { CreateProduct, Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  get() {
    return this.http.get<ApiResponse<Product[]>>(
      `${environment.apiUrl}/product`,
    );
  }

  create(product: CreateProduct) {
    return this.http.post<ApiResponse<Product>>(
      `${environment.apiUrl}/product`,
      product,
    );
  }
}
