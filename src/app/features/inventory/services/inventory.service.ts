import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResponse } from 'src/app/theme/shared/models/response.model';
import { environment } from 'src/environments/environment';
import { BatchLookup, CreateInventory, Inventory } from '../models/inventory.model';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);

  get() {
    return this.http.get<ApiResponse<Inventory[]>>(
      `${environment.apiUrl}/inventory`,
    );
  }

  create(inventory: CreateInventory) {
    return this.http.post<ApiResponse<Inventory>>(
      `${environment.apiUrl}/inventory`,
      inventory,
    );
  }

  getByBatchNumber(batchNumber: string) {
    return this.http.get<ApiResponse<BatchLookup>>(
      `${environment.apiUrl}/inventory/batch/${encodeURIComponent(batchNumber)}`,
    );
  }
}
