import {
  Component,
  ElementRef,
  inject,
  resource,
  signal,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { DatePipe, formatDate, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CardComponent } from 'src/app/theme/shared/components/card/card.component';
import { ListToolbarComponent } from 'src/app/theme/shared/components/list-toolbar/list-toolbar.component';
import { PaginationComponent } from 'src/app/theme/shared/components/pagination/pagination.component';
import { SortableHeaderComponent } from 'src/app/theme/shared/components/sortable-header/sortable-header.component';
import { DEFAULT_PAGE_LIMIT } from 'src/app/theme/shared/constants/pagination.constants';
import { SortOrder } from 'src/app/theme/shared/models/sort-order.enum';
import { createDebouncedSearch } from 'src/app/theme/shared/utils/debounced-search.util';
import { getTodayDateString } from 'src/app/theme/shared/utils/date.util';
import {
  buildExportFileName,
  exportToExcel,
} from 'src/app/theme/shared/utils/excel-export.util';
import { fetchAllPaginatedItems } from 'src/app/theme/shared/utils/fetch-all-paginated.util';
import { nextTableSort } from 'src/app/theme/shared/utils/table-sort.util';
import { ProductUnit } from '../products/models/product-unit.enum';
import {
  formatDisplayQuantity,
  getUnitDisplayLabel,
} from '../inventory/utils/quantity.util';
import {
  Transaction,
  TransactionBatch,
  TransactionProduct,
  TransactionUser,
} from '../transactions/models/transaction.model';
import { SelectedPurchasedItem } from './models/dashboard.model';
import { DashboardService } from './services/dashboard.service';
import { DashboardStatCardComponent } from './components/dashboard-stat-card/dashboard-stat-card.component';
import { TableIconActionComponent } from 'src/app/theme/shared/components/table-icon-action/table-icon-action.component';

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return formatDateInput(date);
}

@Component({
  selector: 'app-dashboard',
  imports: [
    FormsModule,
    DatePipe,
    TitleCasePipe,
    PaginationComponent,
    CardComponent,
    SortableHeaderComponent,
    DashboardStatCardComponent,
    ListToolbarComponent,
    TableIconActionComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private dashboardService = inject(DashboardService);
  private toastr = inject(ToastrService);

  productionCard = viewChild<ElementRef<HTMLElement>>('productionCard');

  readonly liveDebouncedSearch = createDebouncedSearch();

  startDate = signal(getDefaultStartDate());
  endDate = signal(getTodayDateString());
  livePage = signal(1);
  liveLimit = signal(DEFAULT_PAGE_LIMIT);
  purchasedPage = signal(1);
  productionPage = signal(1);
  salesPage = signal(1);
  pageLimit = signal(DEFAULT_PAGE_LIMIT);
  selectedPurchasedItem = signal<SelectedPurchasedItem | null>(null);

  liveExporting = signal(false);
  purchasedExporting = signal(false);
  productionExporting = signal(false);
  salesExporting = signal(false);

  liveSortBy = signal<string | undefined>(undefined);
  liveSortOrder = signal<SortOrder | undefined>(undefined);
  purchasedSortBy = signal<string | undefined>(undefined);
  purchasedSortOrder = signal<SortOrder | undefined>(undefined);
  productionSortBy = signal<string | undefined>(undefined);
  productionSortOrder = signal<SortOrder | undefined>(undefined);
  salesSortBy = signal<string | undefined>(undefined);
  salesSortOrder = signal<SortOrder | undefined>(undefined);

  liveInventoryResource = rxResource({
    params: () => ({
      page: this.livePage(),
      limit: this.liveLimit(),
      search: this.liveDebouncedSearch.debouncedSearch(),
      sortBy: this.liveSortBy(),
      sortOrder: this.liveSortOrder(),
    }),
    stream: ({ params }) =>
      this.dashboardService.getLiveInventory(params).pipe(map((response) => response.data)),
  });

  statsResource = resource({
    params: () => ({
      startDate: this.startDate(),
      endDate: this.endDate(),
    }),
    loader: async ({ params }) => {
      const response = await firstValueFrom(
        this.dashboardService.getStats({
          startDate: params.startDate,
          endDate: params.endDate,
        }),
      );

      return response.data;
    },
  });

  purchasedInventoryResource = resource({
    params: () => ({
      startDate: this.startDate(),
      endDate: this.endDate(),
      page: this.purchasedPage(),
      limit: this.pageLimit(),
      sortBy: this.purchasedSortBy(),
      sortOrder: this.purchasedSortOrder(),
    }),
    loader: async ({ params }) => {
      const response = await firstValueFrom(
        this.dashboardService.getPurchasedInventory({
          startDate: params.startDate,
          endDate: params.endDate,
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        }),
      );

      return response.data;
    },
  });

  productionResource = resource({
    params: () => ({
      startDate: this.startDate(),
      endDate: this.endDate(),
      page: this.productionPage(),
      limit: this.pageLimit(),
      sourceBatchId: this.selectedPurchasedItem()?.batchId,
      sortBy: this.productionSortBy(),
      sortOrder: this.productionSortOrder(),
    }),
    loader: async ({ params }) => {
      const response = await firstValueFrom(
        this.dashboardService.getProduction({
          startDate: params.startDate,
          endDate: params.endDate,
          page: params.page,
          limit: params.limit,
          sourceBatchId: params.sourceBatchId,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        }),
      );

      return response.data;
    },
  });

  salesResource = resource({
    params: () => ({
      startDate: this.startDate(),
      endDate: this.endDate(),
      page: this.salesPage(),
      limit: this.pageLimit(),
      sortBy: this.salesSortBy(),
      sortOrder: this.salesSortOrder(),
    }),
    loader: async ({ params }) => {
      const response = await firstValueFrom(
        this.dashboardService.getSales({
          startDate: params.startDate,
          endDate: params.endDate,
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        }),
      );

      return response.data;
    },
  });

  applyDateFilter(): void {
    this.purchasedPage.set(1);
    this.productionPage.set(1);
    this.salesPage.set(1);
    this.purchasedInventoryResource.reload();
    this.productionResource.reload();
    this.salesResource.reload();
    this.statsResource.reload();
  }

  setDatePreset(days: number): void {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    this.endDate.set(formatDateInput(end));
    this.startDate.set(formatDateInput(start));
    this.applyDateFilter();
  }

  onPurchasedPageChange(page: number): void {
    this.purchasedPage.set(page);
  }

  onProductionPageChange(page: number): void {
    this.productionPage.set(page);
  }

  onSalesPageChange(page: number): void {
    this.salesPage.set(page);
  }

  onLivePageChange(page: number): void {
    this.livePage.set(page);
  }

  onLiveSearchChange(value: string): void {
    this.liveDebouncedSearch.searchInput.set(value);
    this.livePage.set(1);
  }

  onLiveLimitChange(value: number): void {
    this.liveLimit.set(value);
    this.livePage.set(1);
  }

  onLiveSort(column: string): void {
    const next = nextTableSort(
      { sortBy: this.liveSortBy(), sortOrder: this.liveSortOrder() },
      column,
    );
    this.liveSortBy.set(next.sortBy);
    this.liveSortOrder.set(next.sortOrder);
    this.livePage.set(1);
  }

  onPurchasedSort(column: string): void {
    const next = nextTableSort(
      { sortBy: this.purchasedSortBy(), sortOrder: this.purchasedSortOrder() },
      column,
    );
    this.purchasedSortBy.set(next.sortBy);
    this.purchasedSortOrder.set(next.sortOrder);
    this.purchasedPage.set(1);
  }

  onProductionSort(column: string): void {
    const next = nextTableSort(
      { sortBy: this.productionSortBy(), sortOrder: this.productionSortOrder() },
      column,
    );
    this.productionSortBy.set(next.sortBy);
    this.productionSortOrder.set(next.sortOrder);
    this.productionPage.set(1);
  }

  onSalesSort(column: string): void {
    const next = nextTableSort(
      { sortBy: this.salesSortBy(), sortOrder: this.salesSortOrder() },
      column,
    );
    this.salesSortBy.set(next.sortBy);
    this.salesSortOrder.set(next.sortOrder);
    this.salesPage.set(1);
  }

  selectPurchasedItem(transaction: Transaction): void {
    const product = this.getTransactionProduct(transaction);
    const batch = this.getTransactionBatch(transaction);

    if (!product || !batch) {
      return;
    }

    this.selectedPurchasedItem.set({
      productId: product._id,
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      productName: product.name,
    });
    this.productionPage.set(1);

    requestAnimationFrame(() => {
      this.productionCard()?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  clearPurchasedSelection(): void {
    this.selectedPurchasedItem.set(null);
    this.productionPage.set(1);
  }

  getTransactionProduct(transaction: Transaction): TransactionProduct | undefined {
    return typeof transaction.product === 'string'
      ? undefined
      : transaction.product;
  }

  getTransactionBatch(transaction: Transaction): TransactionBatch | undefined {
    return transaction.batch && typeof transaction.batch !== 'string'
      ? transaction.batch
      : undefined;
  }

  getTransactionUser(transaction: Transaction): TransactionUser | undefined {
    return transaction.performedBy && typeof transaction.performedBy !== 'string'
      ? transaction.performedBy
      : undefined;
  }

  getTransactionQuantity(transaction: Transaction): string {
    const product = this.getTransactionProduct(transaction);

    if (!product) {
      return String(transaction.quantity);
    }

    return formatDisplayQuantity(transaction.quantity, product.unit);
  }

  getProducedFromLabel(transaction: Transaction): string {
    const producedFrom = this.getTransactionBatch(transaction)?.producedFrom;

    if (!producedFrom?.length) {
      return '—';
    }

    return producedFrom
      .flatMap((consumption) =>
        consumption.batches.map(
          (batch) => `${batch.batchNumber} (${consumption.productName})`,
        ),
      )
      .join(', ');
  }

  getLiveQuantityLabel(item: {
    displayAvailableQuantity: number;
    unit: ProductUnit;
  }): string {
    return `${item.displayAvailableQuantity} ${getUnitDisplayLabel(item.unit)}`;
  }

  getMinimumQuantityLabel(item: {
    displayLowStockAlert: number;
    unit: ProductUnit;
  }): string {
    return `${item.displayLowStockAlert} ${getUnitDisplayLabel(item.unit)}`;
  }

  async exportLiveInventory(): Promise<void> {
    await this.runExport(
      this.liveExporting,
      'Live Inventory',
      () =>
        fetchAllPaginatedItems((page, limit) =>
          this.dashboardService
            .getLiveInventory({
              page,
              limit,
              search: this.liveDebouncedSearch.debouncedSearch(),
              sortBy: this.liveSortBy(),
              sortOrder: this.liveSortOrder(),
            })
            .pipe(map((response) => response.data)),
        ),
      (items) =>
        exportToExcel(
          items,
          [
            {
              header: 'Product',
              value: (item) => this.toTitleCase(item.productName),
            },
            {
              header: 'Type',
              value: (item) => this.toTitleCase(item.productType),
            },
            {
              header: 'Available Quantity',
              value: (item) => this.getLiveQuantityLabel(item),
            },
            {
              header: 'Minimum',
              value: (item) =>
                item.displayLowStockAlert > 0
                  ? this.getMinimumQuantityLabel(item)
                  : '—',
            },
            { header: 'Batches', value: (item) => item.batchCount },
            {
              header: 'Status',
              value: (item) => (item.isLowStock ? 'Low Stock' : 'Available'),
            },
          ],
          'Live Inventory',
          buildExportFileName('live-inventory'),
        ),
    );
  }

  async exportPurchasedInventory(): Promise<void> {
    await this.runExport(
      this.purchasedExporting,
      'Purchased Inventory',
      () =>
        fetchAllPaginatedItems((page, limit) =>
          this.dashboardService
            .getPurchasedInventory({
              startDate: this.startDate(),
              endDate: this.endDate(),
              page,
              limit,
              sortBy: this.purchasedSortBy(),
              sortOrder: this.purchasedSortOrder(),
            })
            .pipe(map((response) => response.data)),
        ),
      (transactions) =>
        exportToExcel(
          transactions,
          [
            {
              header: 'Date',
              value: (transaction) => this.formatExportDate(transaction.createdAt),
            },
            {
              header: 'Product',
              value: (transaction) =>
                this.toTitleCase(this.getTransactionProduct(transaction)?.name ?? '—'),
            },
            {
              header: 'Batch',
              value: (transaction) =>
                this.getTransactionBatch(transaction)?.batchNumber ?? '—',
            },
            {
              header: 'Quantity',
              value: (transaction) => this.getTransactionQuantity(transaction),
            },
            {
              header: 'Performed By',
              value: (transaction) =>
                this.getTransactionUser(transaction)?.name ?? '—',
            },
          ],
          'Purchased Inventory',
          buildExportFileName('purchased-inventory'),
        ),
    );
  }

  async exportProduction(): Promise<void> {
    const selected = this.selectedPurchasedItem();

    await this.runExport(
      this.productionExporting,
      'Production',
      () =>
        fetchAllPaginatedItems((page, limit) =>
          this.dashboardService
            .getProduction({
              startDate: this.startDate(),
              endDate: this.endDate(),
              page,
              limit,
              sourceBatchId: selected?.batchId,
              sortBy: this.productionSortBy(),
              sortOrder: this.productionSortOrder(),
            })
            .pipe(map((response) => response.data)),
        ),
      (transactions) =>
        exportToExcel(
          transactions,
          [
            {
              header: 'Date',
              value: (transaction) => this.formatExportDate(transaction.createdAt),
            },
            {
              header: 'Product',
              value: (transaction) =>
                this.toTitleCase(this.getTransactionProduct(transaction)?.name ?? '—'),
            },
            {
              header: 'Output Batch',
              value: (transaction) =>
                this.getTransactionBatch(transaction)?.batchNumber ?? '—',
            },
            {
              header: 'Produced From',
              value: (transaction) => this.getProducedFromLabel(transaction),
            },
            {
              header: 'Quantity',
              value: (transaction) => this.getTransactionQuantity(transaction),
            },
            {
              header: 'Performed By',
              value: (transaction) =>
                this.getTransactionUser(transaction)?.name ?? '—',
            },
          ],
          'Production',
          buildExportFileName('production'),
        ),
    );
  }

  async exportSales(): Promise<void> {
    await this.runExport(
      this.salesExporting,
      'Sales',
      () =>
        fetchAllPaginatedItems((page, limit) =>
          this.dashboardService
            .getSales({
              startDate: this.startDate(),
              endDate: this.endDate(),
              page,
              limit,
              sortBy: this.salesSortBy(),
              sortOrder: this.salesSortOrder(),
            })
            .pipe(map((response) => response.data)),
        ),
      (transactions) =>
        exportToExcel(
          transactions,
          [
            {
              header: 'Date',
              value: (transaction) => this.formatExportDate(transaction.createdAt),
            },
            {
              header: 'Product',
              value: (transaction) =>
                this.toTitleCase(this.getTransactionProduct(transaction)?.name ?? '—'),
            },
            {
              header: 'Batch',
              value: (transaction) =>
                this.getTransactionBatch(transaction)?.batchNumber ?? '—',
            },
            {
              header: 'Quantity',
              value: (transaction) => this.getTransactionQuantity(transaction),
            },
            {
              header: 'Performed By',
              value: (transaction) =>
                this.getTransactionUser(transaction)?.name ?? '—',
            },
            {
              header: 'Remarks',
              value: (transaction) => transaction.remarks ?? '—',
            },
          ],
          'Sales',
          buildExportFileName('sales'),
        ),
    );
  }

  private async runExport<T>(
    exporting: WritableSignal<boolean>,
    label: string,
    fetchItems: () => Promise<T[]>,
    exportItems: (items: T[]) => void,
  ): Promise<void> {
    if (exporting()) {
      return;
    }

    exporting.set(true);

    try {
      const items = await fetchItems();

      if (!items.length) {
        this.toastr.warning(`No ${label.toLowerCase()} data to export.`, 'Export');
        return;
      }

      exportItems(items);
      this.toastr.success(`${label} exported successfully.`, 'Export');
    } catch {
      this.toastr.error(`Failed to export ${label.toLowerCase()}.`, 'Export');
    } finally {
      exporting.set(false);
    }
  }

  private formatExportDate(value: string): string {
    return formatDate(value, 'medium', 'en-US');
  }

  private toTitleCase(value: string): string {
    return value
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
