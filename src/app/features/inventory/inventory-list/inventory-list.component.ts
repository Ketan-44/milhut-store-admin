import { Component, inject, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { map, from } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { PaginationComponent } from 'src/app/theme/shared/components/pagination/pagination.component';
import { ListToolbarComponent } from 'src/app/theme/shared/components/list-toolbar/list-toolbar.component';
import { SortableHeaderComponent } from 'src/app/theme/shared/components/sortable-header/sortable-header.component';
import { TableIconActionComponent } from 'src/app/theme/shared/components/table-icon-action/table-icon-action.component';
import { DEFAULT_PAGE_LIMIT } from 'src/app/theme/shared/constants/pagination.constants';
import { SortOrder } from 'src/app/theme/shared/models/sort-order.enum';
import { createDebouncedSearch } from 'src/app/theme/shared/utils/debounced-search.util';
import { nextTableSort } from 'src/app/theme/shared/utils/table-sort.util';
import { Product } from '../../products/models/product.model';
import { ProductService } from '../../products/services/product.service';
import { Inventory } from '../models/inventory.model';
import {
  InventoryQrPreviewComponent,
  QrPreviewData,
} from '../inventory-qr-preview/inventory-qr-preview.component';
import { InventoryService } from '../services/inventory.service';
import { formatDisplayQuantity } from '../utils/quantity.util';

@Component({
  selector: 'app-inventory-list',
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.scss'],
  imports: [
    RouterModule,
    DatePipe,
    TitleCasePipe,
    InventoryQrPreviewComponent,
    PaginationComponent,
    SortableHeaderComponent,
    ListToolbarComponent,
    TableIconActionComponent,
  ],
})
export class InventoryListComponent {
  private inventoryService = inject(InventoryService);
  private productService = inject(ProductService);
  private toastr = inject(ToastrService);

  readonly debouncedSearch = createDebouncedSearch();

  page = signal(1);
  limit = signal(DEFAULT_PAGE_LIMIT);
  sortBy = signal<string | undefined>(undefined);
  sortOrder = signal<SortOrder | undefined>(undefined);
  deletingId = signal<string | null>(null);
  qrPreview: QrPreviewData | null = null;

  inventoryResource = rxResource({
    params: () => ({
      page: this.page(),
      limit: this.limit(),
      search: this.debouncedSearch.debouncedSearch(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
    }),
    stream: ({ params }) =>
      this.inventoryService.get(params).pipe(
        map((inventoryResponse) => inventoryResponse.data),
      ),
  });

  productsResource = rxResource({
    stream: () =>
      from(this.productService.getAllItems()).pipe(
        map((products) => new Map(products.map((product) => [product._id, product]))),
      ),
  });

  onPageChange(page: number): void {
    this.page.set(page);
  }

  onSearchChange(value: string): void {
    this.debouncedSearch.searchInput.set(value);
    this.page.set(1);
  }

  onLimitChange(value: number): void {
    this.limit.set(value);
    this.page.set(1);
  }

  onSort(column: string): void {
    const next = nextTableSort(
      { sortBy: this.sortBy(), sortOrder: this.sortOrder() },
      column,
    );
    this.sortBy.set(next.sortBy);
    this.sortOrder.set(next.sortOrder);
    this.page.set(1);
  }

  get products(): Map<string, Product> {
    return this.productsResource.value() ?? new Map();
  }

  getProductName(productId: string, products: Map<string, Product>): string {
    return products.get(productId)?.name ?? productId;
  }

  getDisplayQuantity(
    quantity: number,
    productId: string,
    products: Map<string, Product>,
  ): string {
    const product = products.get(productId);
    if (!product) {
      return String(quantity);
    }

    return formatDisplayQuantity(quantity, product.unit);
  }

  isExpired(expiryDate?: string): boolean {
    if (!expiryDate) {
      return false;
    }

    return new Date(expiryDate).getTime() < Date.now();
  }

  viewQr(batch: Inventory): void {
    this.qrPreview = {
      batchNumber: batch.batchNumber,
      productName: this.getProductName(batch.productId, this.products),
      expiryDate: batch.expiryDate,
    };
  }

  closeQrPreview(): void {
    this.qrPreview = null;
  }

  deleteBatch(id: string, batchNumber: string): void {
    if (!confirm(`Delete batch "${batchNumber}"? This cannot be undone.`)) {
      return;
    }

    this.deletingId.set(id);

    this.inventoryService.delete(id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.toastr.success('Batch deleted successfully.', 'Success');
        this.inventoryResource.reload();
      },
      error: (error) => {
        this.deletingId.set(null);
        this.toastr.error(error.message ?? 'Failed to delete batch.', 'Error');
      },
    });
  }
}
