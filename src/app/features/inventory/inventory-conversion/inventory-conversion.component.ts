import { Component, computed, inject, OnDestroy, OnInit, resource } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { Product } from '../../products/models/product.model';
import { ProductType } from '../../products/models/product-type.enum';
import { ProductUnit } from '../../products/models/product-unit.enum';
import { ProductService } from '../../products/services/product.service';
import { BatchType } from '../models/batch-type.enum';
import { Inventory } from '../models/inventory.model';
import { InventoryService } from '../services/inventory.service';
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
} from '../utils/quantity.util';
import {
  getTodayDateString,
  optionalExpiryDateValidators,
} from 'src/app/theme/shared/utils/date.util';

@Component({
  selector: 'app-inventory-conversion',
  imports: [RouterModule, ReactiveFormsModule, TitleCasePipe],
  templateUrl: './inventory-conversion.component.html',
  styleUrl: './inventory-conversion.component.scss',
})
export class InventoryConversionComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private productService = inject(ProductService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private subscriptions = new Subscription();

  submitted = false;
  saving = false;
  errorMessage = '';
  readonly minExpiryDate = getTodayDateString();

  formDataResource = resource({
    loader: async () => {
      const [batches, products] = await Promise.all([
        this.inventoryService.getAllItems(),
        this.productService.getAllItems(),
      ]);

      return {
        rawBatches: batches.filter((batch) => {
          if (batch.batchType !== BatchType.RAW || batch.remainingQuantity <= 0) {
            return false;
          }

          if (batch.expiryDate && new Date(batch.expiryDate).getTime() < Date.now()) {
            return false;
          }

          return true;
        }),
        finishedProducts: products.filter(
          (product) => product.isActive && product.type === ProductType.FINISHED,
        ),
        products: new Map(products.map((product) => [product._id, product])),
      };
    },
  });

  conversionForm = this.fb.nonNullable.group({
    sourceBatchId: ['', Validators.required],
    quantity: [null as number | null, [Validators.required, Validators.min(0.001)]],
    finishedProductId: ['', Validators.required],
    expiryDate: ['', optionalExpiryDateValidators(this.minExpiryDate)],
    remarks: ['', Validators.maxLength(500)],
  });

  isFormLoading = computed(
    () =>
      this.formDataResource.isLoading() && !this.formDataResource.hasValue(),
  );

  ngOnInit(): void {
    this.subscriptions.add(
      this.conversionForm.controls.sourceBatchId.valueChanges.subscribe(() => {
        this.onSourceBatchChange();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get f() {
    return this.conversionForm.controls;
  }

  get rawBatches(): Inventory[] {
    return this.formDataResource.value()?.rawBatches ?? [];
  }

  get finishedProducts(): Product[] {
    return this.formDataResource.value()?.finishedProducts ?? [];
  }

  get products(): Map<string, Product> {
    return this.formDataResource.value()?.products ?? new Map();
  }

  get selectedRawBatch(): Inventory | undefined {
    const batchId = this.conversionForm.controls.sourceBatchId.value;
    return this.rawBatches.find((batch) => batch._id === batchId);
  }

  get selectedRawProduct(): Product | undefined {
    const batch = this.selectedRawBatch;
    return batch ? this.products.get(batch.productId) : undefined;
  }

  get selectedFinishedProduct(): Product | undefined {
    const productId = this.conversionForm.controls.finishedProductId.value;
    return this.finishedProducts.find((product) => product._id === productId);
  }

  get conversionQuantityLabel(): string {
    return getQuantityLabel('Conversion quantity', this.selectedRawProduct?.unit);
  }

  get conversionQuantityStep(): string {
    return getQuantityStep(this.selectedRawProduct?.unit ?? ProductUnit.PIECE);
  }

  get conversionQuantityPlaceholder(): string {
    return getQuantityPlaceholder(this.selectedRawProduct?.unit ?? ProductUnit.PIECE);
  }

  get conversionQuantityMin(): number {
    return getQuantityMin(this.selectedRawProduct?.unit ?? ProductUnit.PIECE);
  }

  get conversionQuantityHint(): string {
    const unit = this.selectedRawProduct?.unit;

    if (!unit) {
      return '';
    }

    return getQuantityHint(unit);
  }

  get maxConversionQuantityHint(): string {
    const batch = this.selectedRawBatch;
    const product = this.selectedRawProduct;

    if (!batch || !product) {
      return '';
    }

    return `Available in batch: ${formatDisplayQuantity(batch.remainingQuantity, product.unit)}`;
  }

  get outputQuantityPreview(): string {
    const quantity = this.conversionForm.controls.quantity.value;
    const finishedProduct = this.selectedFinishedProduct;
    const rawProduct = this.selectedRawProduct;

    if (quantity == null || !finishedProduct || !rawProduct) {
      return '';
    }

    if (finishedProduct.unit === ProductUnit.PIECE) {
      return `1 ${getUnitDisplayLabel(finishedProduct.unit)} (from ${quantity} ${getUnitDisplayLabel(rawProduct.unit)})`;
    }

    return `${quantity} ${getUnitDisplayLabel(finishedProduct.unit)}`;
  }

  get outputQuantityLabel(): string {
    return getQuantityLabel('Output quantity', this.selectedFinishedProduct?.unit);
  }

  getRawBatchLabel(batch: Inventory): string {
    const product = this.products.get(batch.productId);

    if (!product) {
      return batch.batchNumber;
    }

    return `${batch.batchNumber} — ${product.name} (${formatDisplayQuantity(batch.remainingQuantity, product.unit)})`;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.updateQuantityValidators();

    if (this.conversionForm.invalid) {
      this.conversionForm.markAllAsTouched();
      return;
    }

    const { sourceBatchId, quantity, finishedProductId, expiryDate, remarks } =
      this.conversionForm.getRawValue();
    const rawProduct = this.selectedRawProduct;

    if (!rawProduct || quantity == null || !isValidDisplayQuantity(quantity, rawProduct.unit)) {
      this.errorMessage =
        rawProduct?.unit === ProductUnit.PIECE
          ? 'Quantity must be a whole number for piece products.'
          : 'Quantity must be greater than zero.';
      return;
    }

    const payload = {
      sourceBatchId,
      finishedProductId,
      quantity,
      ...(expiryDate ? { expiryDate } : {}),
      ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
    };

    this.saving = true;

    this.inventoryService.convert(payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.toastr.success(
          `Conversion completed. New batch: ${response.data.producedBatch.batch.batchNumber}`,
          'Success',
        );
        this.router.navigate(['/inventory'], {
          queryParams: { search: response.data.producedBatch.batch.batchNumber },
        });
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error.message ?? 'Failed to convert batch.';
        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }

  private onSourceBatchChange(): void {
    const batch = this.selectedRawBatch;
    const product = this.selectedRawProduct;

    if (!batch || !product) {
      this.conversionForm.controls.quantity.setValue(null);
      this.updateQuantityValidators();
      return;
    }

    this.conversionForm.controls.quantity.setValue(
      toDisplayQuantity(batch.remainingQuantity, product.unit),
    );
    this.updateQuantityValidators();
  }

  private updateQuantityValidators(): void {
    const quantityControl = this.conversionForm.controls.quantity;
    const product = this.selectedRawProduct;
    const batch = this.selectedRawBatch;
    const unit = product?.unit ?? ProductUnit.PIECE;
    const validators = [Validators.required, Validators.min(getQuantityMin(unit))];

    if (unit === ProductUnit.PIECE) {
      validators.push(pieceQuantityValidator());
    }

    if (product && batch) {
      validators.push(
        Validators.max(toDisplayQuantity(batch.remainingQuantity, product.unit)),
      );
    }

    quantityControl.setValidators(validators);
    quantityControl.updateValueAndValidity();
  }
}
