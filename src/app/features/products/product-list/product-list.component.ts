import { Component, inject, signal } from '@angular/core';
import { NgClass, TitleCasePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { PaginationComponent } from 'src/app/theme/shared/components/pagination/pagination.component';
import { ListToolbarComponent } from 'src/app/theme/shared/components/list-toolbar/list-toolbar.component';
import { SortableHeaderComponent } from 'src/app/theme/shared/components/sortable-header/sortable-header.component';
import { TableIconActionComponent } from 'src/app/theme/shared/components/table-icon-action/table-icon-action.component';
import { DEFAULT_PAGE_LIMIT } from 'src/app/theme/shared/constants/pagination.constants';
import { SortOrder } from 'src/app/theme/shared/models/sort-order.enum';
import { createDebouncedSearch } from 'src/app/theme/shared/utils/debounced-search.util';
import { nextTableSort } from 'src/app/theme/shared/utils/table-sort.util';
import { ProductService } from '../services/product.service';
import { Product } from '../models/product.model';
import {
  getUnitDisplayLabel,
  toDisplayQuantity,
} from '../../inventory/utils/quantity.util';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
  imports: [NgClass, TitleCasePipe, RouterModule, PaginationComponent, SortableHeaderComponent, ListToolbarComponent, TableIconActionComponent],
})
export class ProductListComponent {
  private productService = inject(ProductService);
  private toastr = inject(ToastrService);

  readonly debouncedSearch = createDebouncedSearch();

  page = signal(1);
  limit = signal(DEFAULT_PAGE_LIMIT);
  sortBy = signal<string | undefined>(undefined);
  sortOrder = signal<SortOrder | undefined>(undefined);
  deletingId = signal<string | null>(null);

  productResource = rxResource({
    params: () => ({
      page: this.page(),
      limit: this.limit(),
      search: this.debouncedSearch.debouncedSearch(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
    }),
    stream: ({ params }) =>
      this.productService.get(params).pipe(map((response) => response.data)),
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

  getMinimumQuantityLabel(product: Product): string {
    if (!product.lowStockAlert || product.lowStockAlert <= 0) {
      return '—';
    }

    return `${toDisplayQuantity(product.lowStockAlert, product.unit)} ${getUnitDisplayLabel(product.unit)}`;
  }

  deleteProduct(id: string, name: string): void {
    if (!confirm(`Delete product "${name}"? This cannot be undone.`)) {
      return;
    }

    this.deletingId.set(id);

    this.productService.delete(id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.toastr.success('Product deleted successfully.', 'Success');
        this.productResource.reload();
      },
      error: (error) => {
        this.deletingId.set(null);
        this.toastr.error(error.message ?? 'Failed to delete product.', 'Error');
      },
    });
  }
}
