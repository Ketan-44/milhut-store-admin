import { Component, inject, OnDestroy, OnInit, resource } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom, Subscription } from 'rxjs';
import { BatchType } from '../models/batch-type.enum';
import { Inventory } from '../models/inventory.model';
import { InventoryService } from '../services/inventory.service';
import { Product } from '../../products/models/product.model';
import { ProductType } from '../../products/models/product-type.enum';
import { ProductUnit } from '../../products/models/product-unit.enum';
import { ProductService } from '../../products/services/product.service';
import {
  getQuantityHint,
  getQuantityLabel,
  getQuantityMin,
  getQuantityPlaceholder,
  getQuantityStep,
  getUnitDisplayLabel,
  pieceQuantityValidator,
  toDisplayQuantity,
} from '../utils/quantity.util';

@Component({
  selector: 'app-inventory-form',
  imports: [RouterModule, ReactiveFormsModule],
  templateUrl: './inventory-form.component.html',
  styleUrl: './inventory-form.component.scss',
})
export class InventoryFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private productService = inject(ProductService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private subscriptions = new Subscription();

  formDataResource = resource({
    loader: async () => {
      const [productResponse, inventoryResponse] = await Promise.all([
        firstValueFrom(this.productService.get()),
        firstValueFrom(this.inventoryService.get()),
      ]);

      return {
        products: productResponse.data,
        parentBatches: inventoryResponse.data,
      };
    },
  });

  submitted = false;
  saving = false;
  errorMessage = '';

  inventoryForm = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    quantity: [null as number | null, [Validators.required, Validators.min(0.001)]],
    batchType: [BatchType.RAW, Validators.required],
    parentBatch: [''],
    expiryDate: ['', Validators.required],
  });

  get f() {
    return this.inventoryForm.controls;
  }

  get products(): Product[] {
    return this.formDataResource.value()?.products ?? [];
  }

  get parentBatches(): Inventory[] {
    return this.formDataResource.value()?.parentBatches ?? [];
  }

  get selectedProduct(): Product | undefined {
    const productId = this.inventoryForm.controls.productId.value;
    return this.products.find((product) => product._id === productId);
  }

  get showParentBatchField(): boolean {
    const product = this.selectedProduct;
    return product?.type === ProductType.PROCESSED || product?.type === ProductType.FINISHED;
  }

  get showBatchTypeDropdown(): boolean {
    return this.showParentBatchField && !!this.inventoryForm.controls.parentBatch.value;
  }

  get showBatchTypeReadonly(): boolean {
    return this.selectedProduct?.type === ProductType.RAW;
  }

  get availableParentBatches(): Inventory[] {
    const product = this.selectedProduct;

    if (!product) {
      return [];
    }

    return this.parentBatches.filter((batch) => {
      if (batch.remainingQuantity <= 0) {
        return false;
      }

      if (product.type === ProductType.PROCESSED) {
        return batch.batchType === BatchType.RAW;
      }

      if (product.type === ProductType.FINISHED) {
        return batch.batchType === BatchType.CONVERTED;
      }

      return false;
    });
  }

  get availableBatchTypes(): BatchType[] {
    const product = this.selectedProduct;

    if (!product || !this.showBatchTypeDropdown) {
      return [];
    }

    if (product.type === ProductType.PROCESSED) {
      return [BatchType.CONVERTED];
    }

    if (product.type === ProductType.FINISHED) {
      return [BatchType.PRODUCED];
    }

    return [];
  }

  get selectedParentBatch(): Inventory | undefined {
    const parentBatchId = this.inventoryForm.controls.parentBatch.value;
    return this.parentBatches.find((batch) => batch._id === parentBatchId);
  }

  get selectedParentBatchProduct(): Product | undefined {
    const parentBatch = this.selectedParentBatch;

    if (!parentBatch) {
      return undefined;
    }

    return this.products.find((product) => product._id === parentBatch.productId);
  }

  get quantityUnit(): ProductUnit | undefined {
    return this.selectedProduct?.unit;
  }

  get quantityLabel(): string {
    return getQuantityLabel('Quantity', this.quantityUnit);
  }

  get quantityMin(): number {
    return getQuantityMin(this.quantityUnit ?? ProductUnit.PIECE);
  }

  get quantityStep(): string {
    return getQuantityStep(this.selectedProduct?.unit ?? ProductUnit.PIECE);
  }

  get quantityPlaceholder(): string {
    return getQuantityPlaceholder(this.selectedProduct?.unit ?? ProductUnit.PIECE);
  }

  get quantityHint(): string {
    const product = this.selectedProduct;

    if (!product) {
      return '';
    }

    return getQuantityHint(product.unit);
  }

  get parentBatchHint(): string {
    const product = this.selectedProduct;

    if (!product) {
      return '';
    }

    if (product.type === ProductType.PROCESSED) {
      return 'Select a RAW batch to convert into this processed product.';
    }

    if (product.type === ProductType.FINISHED) {
      return 'Select a CONVERTED batch to produce this finished product.';
    }

    return '';
  }

  get maxParentQuantityHint(): string {
    const parentBatch = this.selectedParentBatch;
    const parentProduct = this.selectedParentBatchProduct;

    if (!parentBatch || !parentProduct) {
      return '';
    }

    const available = toDisplayQuantity(parentBatch.remainingQuantity, parentProduct.unit);
    return `Available in parent batch: ${available} ${getUnitDisplayLabel(parentProduct.unit)}`;
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.inventoryForm.controls.productId.valueChanges.subscribe(() => {
        this.onProductChange();
      }),
    );

    this.subscriptions.add(
      this.inventoryForm.controls.parentBatch.valueChanges.subscribe(() => {
        this.onParentBatchChange();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.inventoryForm.invalid) {
      this.inventoryForm.markAllAsTouched();
      return;
    }

    const { productId, quantity, batchType, parentBatch, expiryDate } =
      this.inventoryForm.getRawValue();

    const payload = {
      productId,
      quantity: quantity!,
      batchType,
      expiryDate,
      ...(parentBatch ? { parentBatch } : {}),
    };

    this.saving = true;

    this.inventoryService.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success('Inventory batch created successfully.', 'Success');
        this.router.navigate(['/inventory']);
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error.message ?? 'Failed to create inventory batch.';
        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }

  private onProductChange(): void {
    const product = this.selectedProduct;
    const parentBatchControl = this.inventoryForm.controls.parentBatch;
    const batchTypeControl = this.inventoryForm.controls.batchType;
    const quantityControl = this.inventoryForm.controls.quantity;

    parentBatchControl.setValue('');
    quantityControl.setValue(null);

    if (!product) {
      batchTypeControl.setValue(BatchType.RAW);
      this.updateParentBatchValidators();
      this.updateQuantityValidators();
      return;
    }

    if (product.type === ProductType.RAW) {
      batchTypeControl.setValue(BatchType.RAW);
      parentBatchControl.clearValidators();
      parentBatchControl.setValue('');
    } else {
      batchTypeControl.setValue(this.getDefaultBatchType(product.type));
      parentBatchControl.setValidators([Validators.required]);
    }

    parentBatchControl.updateValueAndValidity();
    this.updateQuantityValidators();
  }

  private onParentBatchChange(): void {
    const product = this.selectedProduct;
    const parentBatchId = this.inventoryForm.controls.parentBatch.value;
    const batchTypeControl = this.inventoryForm.controls.batchType;

    if (!product || !parentBatchId) {
      if (product?.type === ProductType.RAW) {
        batchTypeControl.setValue(BatchType.RAW);
      }
      this.updateQuantityValidators();
      return;
    }

    batchTypeControl.setValue(this.getDefaultBatchType(product.type));
    this.updateQuantityValidators();
  }

  private getDefaultBatchType(productType: ProductType): BatchType {
    switch (productType) {
      case ProductType.RAW:
        return BatchType.RAW;
      case ProductType.PROCESSED:
        return BatchType.CONVERTED;
      case ProductType.FINISHED:
        return BatchType.PRODUCED;
    }
  }

  private updateParentBatchValidators(): void {
    const parentBatchControl = this.inventoryForm.controls.parentBatch;

    if (this.showParentBatchField) {
      parentBatchControl.setValidators([Validators.required]);
    } else {
      parentBatchControl.clearValidators();
      parentBatchControl.setValue('');
    }

    parentBatchControl.updateValueAndValidity();
  }

  private updateQuantityValidators(): void {
    const quantityControl = this.inventoryForm.controls.quantity;
    const product = this.selectedProduct;
    const parentBatch = this.selectedParentBatch;

    const unit = product?.unit ?? ProductUnit.PIECE;
    const validators = [Validators.required, Validators.min(getQuantityMin(unit))];

    if (unit === ProductUnit.PIECE) {
      validators.push(pieceQuantityValidator());
    }

    if (parentBatch && product) {
      const maxQuantity = toDisplayQuantity(parentBatch.remainingQuantity, product.unit);
      validators.push(Validators.max(maxQuantity));
    }

    quantityControl.setValidators(validators);
    quantityControl.updateValueAndValidity();
  }
}
