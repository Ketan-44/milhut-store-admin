import { Component, inject, OnInit, resource, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { map } from 'rxjs';
import { PaginationComponent } from 'src/app/theme/shared/components/pagination/pagination.component';
import { ListToolbarComponent } from 'src/app/theme/shared/components/list-toolbar/list-toolbar.component';
import { SortableHeaderComponent } from 'src/app/theme/shared/components/sortable-header/sortable-header.component';
import { TableIconActionComponent } from 'src/app/theme/shared/components/table-icon-action/table-icon-action.component';
import { DEFAULT_PAGE_LIMIT } from 'src/app/theme/shared/constants/pagination.constants';
import { SortOrder } from 'src/app/theme/shared/models/sort-order.enum';
import { createDebouncedSearch } from 'src/app/theme/shared/utils/debounced-search.util';
import { nextTableSort } from 'src/app/theme/shared/utils/table-sort.util';
import { BatchType } from '../../inventory/models/batch-type.enum';
import { Inventory } from '../../inventory/models/inventory.model';
import { InventoryService } from '../../inventory/services/inventory.service';
import {
  formatDisplayQuantity,
  getQuantityHint,
  getQuantityLabel,
  getQuantityMin,
  getQuantityPlaceholder,
  getQuantityStep,
  isValidDisplayQuantity,
  pieceQuantityValidator,
  toDisplayQuantity,
} from '../../inventory/utils/quantity.util';
import { Product } from '../../products/models/product.model';
import { ProductUnit } from '../../products/models/product-unit.enum';
import { ProductService } from '../../products/services/product.service';
import { TransactionType } from '../models/transaction-type.enum';
import {
  Transaction,
  TransactionBatch,
  TransactionProduct,
  TransactionUser,
} from '../models/transaction.model';
import { TransactionService } from '../services/transaction.service';
import { TransactionDetailModalComponent } from '../transaction-detail-modal/transaction-detail-modal.component';
import { NoSpecialCharLabelPipe } from 'src/app/theme/shared/pipes/noSpecialCharLabel.pipe';

@Component({
  selector: 'app-transaction-page',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    TitleCasePipe,
    PaginationComponent,
    TransactionDetailModalComponent,
    SortableHeaderComponent,
    ListToolbarComponent,
    TableIconActionComponent,
    NoSpecialCharLabelPipe
  ],
  templateUrl: './transaction-page.component.html',
  styleUrl: './transaction-page.component.scss',
})
export class TransactionPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private transactionService = inject(TransactionService);
  private inventoryService = inject(InventoryService);
  private productService = inject(ProductService);
  private toastr = inject(ToastrService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly debouncedSearch = createDebouncedSearch();

  activeTab: 'list' | 'sale' = 'list';
  submitted = false;
  saving = false;
  errorMessage = '';
  transactionPage = signal(1);
  transactionLimit = signal(DEFAULT_PAGE_LIMIT);
  transactionSortBy = signal<string | undefined>(undefined);
  transactionSortOrder = signal<SortOrder | undefined>(undefined);
  viewingTransactionId = signal<string | null>(null);

  saleDataResource = resource({
    loader: async () => {
      const [batches, products] = await Promise.all([
        this.inventoryService.getAllItems(),
        this.productService.getAllItems(),
      ]);

      return {
        batches,
        products: new Map(products.map((product) => [product._id, product])),
      };
    },
  });

  transactionListResource = rxResource({
    params: () => ({
      page: this.transactionPage(),
      limit: this.transactionLimit(),
      search: this.debouncedSearch.debouncedSearch(),
      sortBy: this.transactionSortBy(),
      sortOrder: this.transactionSortOrder(),
    }),
    stream: ({ params }) =>
      this.transactionService.get(params).pipe(map((response) => response.data)),
  });

  saleForm = this.fb.nonNullable.group({
    batch: [''],
    quantity: [null as number | null, [Validators.required, Validators.min(0.001)]],
    remarks: [''],
  });

  get f() {
    return this.saleForm.controls;
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const viewId = params.get('view');

      if (viewId) {
        this.activeTab = 'list';
        this.viewingTransactionId.set(viewId);
      }
    });
  }

  get transactions(): Transaction[] {
    return this.transactionListResource.value()?.items ?? [];
  }

  get products(): Map<string, Product> {
    return this.saleDataResource.value()?.products ?? new Map();
  }

  get availableBatches(): Inventory[] {
    return (this.saleDataResource.value()?.batches ?? []).filter((batch) => {
      if (batch.remainingQuantity <= 0) {
        return false;
      }

      if (batch.batchType !== BatchType.FINISHED) {
        return false;
      }

      if (batch.expiryDate && new Date(batch.expiryDate).getTime() < Date.now()) {
        return false;
      }

      return true;
    });
  }

  get selectedBatch(): Inventory | undefined {
    const batchId = this.saleForm.controls.batch.value;
    return this.availableBatches.find((batch) => batch._id === batchId);
  }

  get selectedProduct(): Product | undefined {
    const batch = this.selectedBatch;

    if (!batch) {
      return undefined;
    }

    return this.products.get(batch.productId);
  }

  get quantityLabel(): string {
    return getQuantityLabel('Quantity', this.selectedProduct?.unit);
  }

  get quantityStep(): string {
    return getQuantityStep(this.selectedProduct?.unit ?? ProductUnit.PIECE);
  }

  get quantityPlaceholder(): string {
    return getQuantityPlaceholder(this.selectedProduct?.unit ?? ProductUnit.PIECE);
  }

  get quantityMin(): number {
    return getQuantityMin(this.selectedProduct?.unit ?? ProductUnit.PIECE);
  }

  get quantityHint(): string {
    const unit = this.selectedProduct?.unit;

    if (!unit) {
      return '';
    }

    return getQuantityHint(unit);
  }

  get maxSaleQuantityHint(): string {
    const batch = this.selectedBatch;
    const product = this.selectedProduct;

    if (!batch || !product) {
      return '';
    }

    return `Available in batch: ${formatDisplayQuantity(batch.remainingQuantity, product.unit)}`;
  }

  setTab(tab: 'list' | 'sale'): void {
    this.activeTab = tab;
  }

  onTransactionPageChange(page: number): void {
    this.transactionPage.set(page);
  }

  onSearchChange(value: string): void {
    this.debouncedSearch.searchInput.set(value);
    this.transactionPage.set(1);
  }

  onLimitChange(value: number): void {
    this.transactionLimit.set(value);
    this.transactionPage.set(1);
  }

  onTransactionSort(column: string): void {
    const next = nextTableSort(
      {
        sortBy: this.transactionSortBy(),
        sortOrder: this.transactionSortOrder(),
      },
      column,
    );
    this.transactionSortBy.set(next.sortBy);
    this.transactionSortOrder.set(next.sortOrder);
    this.transactionPage.set(1);
  }

  viewTransaction(id: string): void {
    this.viewingTransactionId.set(id);
  }

  closeTransactionDetail(): void {
    this.viewingTransactionId.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: null },
      queryParamsHandling: 'merge',
    });
  }

  onBatchChange(): void {
    this.updateQuantityValidators();
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

  getTypeBadgeClass(type: TransactionType): string {
    switch (type) {
      case TransactionType.SALE:
        return 'text-bg-danger';
      case TransactionType.IN:
        return 'text-bg-success';
      case TransactionType.PRODUCED:
        return 'text-bg-primary';
      default:
        return 'text-bg-secondary';
    }
  }

  onSubmitSale(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (!this.saleForm.controls.batch.value) {
      this.errorMessage = 'Please select a batch.';
      return;
    }

    this.updateQuantityValidators();

    if (this.saleForm.invalid) {
      this.saleForm.markAllAsTouched();
      return;
    }

    const { batch, quantity, remarks } = this.saleForm.getRawValue();
    const product = this.selectedProduct;

    if (!product || quantity == null || !isValidDisplayQuantity(quantity, product.unit)) {
      this.errorMessage =
        product?.unit === ProductUnit.PIECE
          ? 'Quantity must be a whole number for piece products.'
          : 'Quantity must be greater than zero.';
      return;
    }

    const payload = {
      batch,
      quantity,
      ...(remarks ? { remarks } : {}),
    };

    this.saving = true;

    this.transactionService.createSale(payload).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success('Sale recorded successfully.', 'Success');
        this.saleForm.reset({ batch: '', quantity: null, remarks: '' });
        this.submitted = false;
        this.transactionListResource.reload();
        this.saleDataResource.reload();
        this.activeTab = 'list';
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error.message ?? 'Failed to record sale.';
        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }

  private updateQuantityValidators(): void {
    const quantityControl = this.saleForm.controls.quantity;
    const product = this.selectedProduct;
    const unit = product?.unit ?? ProductUnit.PIECE;

    const validators = [Validators.required, Validators.min(getQuantityMin(unit))];

    if (unit === ProductUnit.PIECE) {
      validators.push(pieceQuantityValidator());
    }

    if (product && this.selectedBatch) {
      const maxQuantity = toDisplayQuantity(
        this.selectedBatch.remainingQuantity,
        product.unit,
      );

      validators.push(Validators.max(maxQuantity));
    }

    quantityControl.setValidators(validators);
    quantityControl.updateValueAndValidity();
  }
}
