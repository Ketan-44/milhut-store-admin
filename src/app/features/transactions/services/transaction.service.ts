import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResponse } from 'src/app/theme/shared/models/response.model';
import { environment } from 'src/environments/environment';
import { CreateSale, Transaction } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private http = inject(HttpClient);

  get() {
    return this.http.get<ApiResponse<Transaction[]>>(
      `${environment.apiUrl}/transaction`,
    );
  }

  createSale(sale: CreateSale) {
    return this.http.post<ApiResponse<Transaction>>(
      `${environment.apiUrl}/transaction/sale`,
      sale,
    );
  }
}
