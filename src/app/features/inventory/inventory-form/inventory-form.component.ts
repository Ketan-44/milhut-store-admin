import { Component, inject, OnDestroy, OnInit, resource } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { BatchType } from '../models/batch-type.enum';
import { CreateInventory } from '../models/inventory.model';
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
  pieceQuantityValidator,
} from '../utils/quantity.util';
import {
  optionalExpiryDateValidators,
  getTodayDateString,
} from 'src/app/theme/shared/utils/date.util';
import { NoSpecialCharLabelPipe } from 'src/app/theme/shared/pipes/noSpecialCharLabel.pipe';

@Component({
  selector: 'app-inventory-form',
  imports: [RouterModule, ReactiveFormsModule, TitleCasePipe, NoSpecialCharLabelPipe],
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
      const products = await this.productService.getAllItems();

      return {
        products: products.filter(
          (product) =>
            product.isActive &&
            (product.type === ProductType.RAW ||
              product.type === ProductType.SEMI_FINISHED ||
              product.type === ProductType.FINISHED),
        ),
      };
    },
  });

  submitted = false;
  saving = false;
  errorMessage = '';
  readonly minExpiryDate = getTodayDateString();

  inventoryForm = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    quantity: [null as number | null, [Validators.required, Validators.min(0.001)]],
    expiryDate: ['', optionalExpiryDateValidators(this.minExpiryDate)],
    sourceName: ['', Validators.maxLength(200)],
  });

  get f() {
    return this.inventoryForm.controls;
  }

  get products(): Product[] {
    return this.formDataResource.value()?.products ?? [];
  }

  get selectedProduct(): Product | undefined {
    const productId = this.inventoryForm.controls.productId.value;
    return this.products.find((product) => product._id === productId);
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

  // get batchTypeHint(): string {
  //   const product = this.selectedProduct;

  //   if (!product) {
  //     return '';
  //   }

  //   if (product.type === ProductType.RAW) {
  //     return 'Stock will be recorded as a Raw batch (IN transaction).';
  //   }

  //   return 'Stock will be recorded as a Finished batch (PRODUCED transaction).';
  // }

  ngOnInit(): void {
    this.subscriptions.add(
      this.inventoryForm.controls.productId.valueChanges.subscribe(() => {
        this.onProductChange();
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

    const { productId, quantity, expiryDate, sourceName } = this.inventoryForm.getRawValue();
    const product = this.selectedProduct;

    if (!product || quantity === null) {
      return;
    }

    const payload: CreateInventory = {
      productId,
      quantity,
      batchType: this.getBatchTypeFromProduct(product.type),
    };

    if (expiryDate) {
      payload.expiryDate = expiryDate;
    }

    const trimmedSourceName = sourceName.trim();
    if (trimmedSourceName) {
      payload.sourceName = trimmedSourceName;
    }

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
    this.inventoryForm.controls.quantity.setValue(null);
    this.updateQuantityValidators();
  }

  private getBatchTypeFromProduct(productType: ProductType): BatchType {
    switch (productType) {
      case ProductType.RAW:
        return BatchType.RAW;
      case ProductType.SEMI_FINISHED:
        return BatchType.SEMI_FINISHED;
      case ProductType.FINISHED:
        return BatchType.FINISHED;
      default:
        return BatchType.RAW;
    }
  }

  private updateQuantityValidators(): void {
    const quantityControl = this.inventoryForm.controls.quantity;
    const product = this.selectedProduct;
    const unit = product?.unit ?? ProductUnit.PIECE;
    const validators = [Validators.required, Validators.min(getQuantityMin(unit))];

    if (unit === ProductUnit.PIECE) {
      validators.push(pieceQuantityValidator());
    }

    quantityControl.setValidators(validators);
    quantityControl.updateValueAndValidity();
  }
}
