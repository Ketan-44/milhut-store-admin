import { Component, inject, resource } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { BatchLookup } from '../../inventory/models/inventory.model';
import { Inventory } from '../../inventory/models/inventory.model';
import { InventoryService } from '../../inventory/services/inventory.service';
import {
  formatDisplayQuantity,
  getQuantityHint,
  getQuantityLabel,
  getQuantityMin,
  getQuantityPlaceholder,
  getQuantityStep,
  getUnitDisplayLabel,
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

type SaleMethod = 'batch' | 'scan';

@Component({
  selector: 'app-transaction-page',
  imports: [ReactiveFormsModule, DatePipe, TitleCasePipe],
  templateUrl: './transaction-page.component.html',
  styleUrl: './transaction-page.component.scss',
})
export class TransactionPageComponent {
  private fb = inject(FormBuilder);
  private transactionService = inject(TransactionService);
  private inventoryService = inject(InventoryService);
  private productService = inject(ProductService);
  private toastr = inject(ToastrService);

  activeTab: 'list' | 'sale' = 'list';
  saleMethod: SaleMethod = 'batch';
  submitted = false;
  saving = false;
  lookingUpBatch = false;
  errorMessage = '';
  batchLookup: BatchLookup | null = null;
  batchLookupError = '';

  pageDataResource = resource({
    loader: async () => {
      const [transactionResponse, inventoryResponse, productResponse] =
        await Promise.all([
          firstValueFrom(this.transactionService.get()),
          firstValueFrom(this.inventoryService.get()),
          firstValueFrom(this.productService.get()),
        ]);

      const products = new Map(
        productResponse.data.map((product) => [product._id, product]),
      );

      return {
        transactions: transactionResponse.data,
        batches: inventoryResponse.data,
        products,
      };
    },
  });

  saleForm = this.fb.nonNullable.group({
    batch: [''],
    batchNumber: [''],
    quantity: [null as number | null, [Validators.required, Validators.min(0.001)]],
    remarks: [''],
  });

  get f() {
    return this.saleForm.controls;
  }

  get transactions(): Transaction[] {
    return this.pageDataResource.value()?.transactions ?? [];
  }

  get products(): Map<string, Product> {
    return this.pageDataResource.value()?.products ?? new Map();
  }

  get availableBatches(): Inventory[] {
    return (this.pageDataResource.value()?.batches ?? []).filter((batch) => {
      if (batch.remainingQuantity <= 0) {
        return false;
      }

      return new Date(batch.expiryDate).getTime() >= Date.now();
    });
  }

  get selectedBatch(): Inventory | undefined {
    const batchId = this.saleForm.controls.batch.value;
    return this.availableBatches.find((batch) => batch._id === batchId);
  }

  get selectedProduct(): Product | undefined {
    if (this.saleMethod === 'scan' && this.batchLookup) {
      const product = this.batchLookup.product;
      return {
        _id: product.id,
        name: product.name,
        type: product.type,
        unit: product.unit,
        lowStockAlert: 0,
        createdBy: '',
        isActive: product.isActive,
      };
    }

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
    if (this.saleMethod === 'scan' && this.batchLookup) {
      return `Available: ${this.batchLookup.batch.displayRemainingQuantity} ${getUnitDisplayLabel(this.batchLookup.product.unit)}`;
    }

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

  setSaleMethod(method: SaleMethod): void {
    this.saleMethod = method;
    this.saleForm.patchValue({ batch: '', batchNumber: '' });
    this.batchLookup = null;
    this.batchLookupError = '';
    this.errorMessage = '';
    this.updateQuantityValidators();
  }

  onBatchChange(): void {
    this.batchLookup = null;
    this.batchLookupError = '';
    this.updateQuantityValidators();
  }

  lookupBatchNumber(): void {
    const batchNumber = this.saleForm.controls.batchNumber.value.trim();

    if (!batchNumber) {
      this.batchLookupError = 'Enter a batch number to lookup.';
      return;
    }

    this.lookingUpBatch = true;
    this.batchLookupError = '';
    this.batchLookup = null;

    this.inventoryService.getByBatchNumber(batchNumber).subscribe({
      next: (response) => {
        this.lookingUpBatch = false;
        this.batchLookup = response.data;

        if (!response.data.batch.canSell) {
          this.batchLookupError = 'This batch cannot be sold (expired or depleted).';
        }

        this.updateQuantityValidators();
      },
      error: (error) => {
        this.lookingUpBatch = false;
        this.batchLookupError = error.message ?? 'Batch not found.';
      },
    });
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

  getTypeBadgeClass(type: TransactionType): string {
    switch (type) {
      case TransactionType.SALE:
        return 'text-bg-danger';
      case TransactionType.IN:
        return 'text-bg-success';
      case TransactionType.CONVERT:
        return 'text-bg-warning';
      case TransactionType.PRODUCE:
        return 'text-bg-primary';
    }
  }

  onSubmitSale(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.saleMethod === 'batch' && !this.saleForm.controls.batch.value) {
      this.errorMessage = 'Please select a batch.';
      return;
    }

    if (this.saleMethod === 'scan') {
      const batchNumber = this.saleForm.controls.batchNumber.value.trim();

      if (!batchNumber) {
        this.errorMessage = 'Please enter a batch number.';
        return;
      }

      if (!this.batchLookup) {
        this.errorMessage = 'Please lookup the batch before recording the sale.';
        return;
      }

      if (!this.batchLookup.batch.canSell) {
        this.errorMessage = 'This batch cannot be sold.';
        return;
      }
    }

    this.updateQuantityValidators();

    if (this.saleForm.invalid) {
      this.saleForm.markAllAsTouched();
      return;
    }

    const { batch, batchNumber, quantity, remarks } = this.saleForm.getRawValue();
    const product = this.selectedProduct;

    if (!product || quantity == null || !isValidDisplayQuantity(quantity, product.unit)) {
      this.errorMessage =
        product?.unit === ProductUnit.PIECE
          ? 'Quantity must be a whole number for piece products.'
          : 'Quantity must be greater than zero.';
      return;
    }

    const payload = {
      quantity,
      ...(remarks ? { remarks } : {}),
      ...(this.saleMethod === 'batch'
        ? { batch }
        : { batchNumber: batchNumber.trim() }),
    };

    this.saving = true;

    this.transactionService.createSale(payload).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success('Sale recorded successfully.', 'Success');
        this.saleForm.reset({ batch: '', batchNumber: '', quantity: null, remarks: '' });
        this.batchLookup = null;
        this.submitted = false;
        this.pageDataResource.reload();
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

    if (product) {
      let maxQuantity: number | undefined;

      if (this.saleMethod === 'scan' && this.batchLookup) {
        maxQuantity = this.batchLookup.batch.displayRemainingQuantity;
      } else if (this.selectedBatch) {
        maxQuantity = toDisplayQuantity(
          this.selectedBatch.remainingQuantity,
          product.unit,
        );
      }

      if (maxQuantity !== undefined) {
        validators.push(Validators.max(maxQuantity));
      }
    }

    quantityControl.setValidators(validators);
    quantityControl.updateValueAndValidity();
  }
}
