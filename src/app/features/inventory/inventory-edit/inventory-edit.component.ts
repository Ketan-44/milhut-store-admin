import { Component, effect, inject, OnDestroy, OnInit, resource, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom, Subscription } from 'rxjs';
import { BatchLookup } from '../models/inventory.model';
import { InventoryService } from '../services/inventory.service';
import { Product } from '../../products/models/product.model';
import { ProductType } from '../../products/models/product-type.enum';
import { ProductUnit } from '../../products/models/product-unit.enum';
import { ProductService } from '../../products/services/product.service';
import {
  formatDisplayQuantity,
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

type BatchFormData = {
  batch: BatchLookup;
  products: Product[];
};

@Component({
  selector: 'app-inventory-edit',
  imports: [RouterModule, ReactiveFormsModule, TitleCasePipe, NoSpecialCharLabelPipe],
  templateUrl: './inventory-edit.component.html',
  styleUrl: './inventory-edit.component.scss',
})
export class InventoryEditComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private subscriptions = new Subscription();

  private readonly batchId = this.route.snapshot.paramMap.get('id');

  batchResource = resource({
    loader: async () => {
      if (!this.batchId) {
        throw new Error('Batch id is missing.');
      }

      const [batchResponse, products] = await Promise.all([
        firstValueFrom(this.inventoryService.getById(this.batchId)),
        this.productService.getAllItems(),
      ]);

      const batchData = batchResponse.data;
      const eligibleProducts = products.filter(
        (product) =>
          product.isActive &&
          (product.type === ProductType.RAW ||
            product.type === ProductType.SEMI_FINISHED ||
            product.type === ProductType.FINISHED),
      );
      const currentProduct = products.find(
        (product) => product._id === batchData.product.id,
      );

      if (
        currentProduct &&
        !eligibleProducts.some((product) => product._id === currentProduct._id)
      ) {
        eligibleProducts.unshift(currentProduct);
      }

      return {
        batch: batchData,
        products: eligibleProducts,
      };
    },
  });

  saving = false;
  submitted = false;
  errorMessage = '';
  formReady = signal(false);
  readonly minExpiryDate = getTodayDateString();

  inventoryForm = this.fb.nonNullable.group({
    batchNumber: [''],
    productId: ['', Validators.required],
    quantity: [null as number | null, [Validators.required, Validators.min(0.001)]],
    expiryDate: ['', optionalExpiryDateValidators(this.minExpiryDate)],
    sourceName: ['', Validators.maxLength(200)],
  });

  constructor() {
    effect(() => {
      const data = this.batchResource.value();

      if (!data || this.formReady()) {
        return;
      }

      queueMicrotask(() => {
        this.initializeForm(data);
        this.formReady.set(true);
      });
    });
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.inventoryForm.controls.productId.valueChanges.subscribe(() => {
        this.updateQuantityValidators();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get f() {
    return this.inventoryForm.controls;
  }

  get products(): Product[] {
    return this.batchResource.value()?.products ?? [];
  }

  get selectedProduct(): Product | undefined {
    const productId = this.inventoryForm.controls.productId.value;
    return this.products.find((product) => product._id === productId);
  }

  get remainingQuantityLabel(): string {
    const batch = this.batchResource.value()?.batch;

    if (!batch) {
      return '';
    }

    return formatDisplayQuantity(
      batch.batch.remainingQuantity,
      batch.product.unit,
    );
  }

  get quantityLabel(): string {
    return getQuantityLabel('Quantity', this.selectedProduct?.unit);
  }

  get quantityMin(): number {
    return getQuantityMin(this.selectedProduct?.unit ?? ProductUnit.PIECE);
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

  get loadErrorMessage(): string {
    const error = this.batchResource.error();

    if (error instanceof Error) {
      return error.message;
    }

    return 'Failed to load batch.';
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (!this.batchId || this.inventoryForm.invalid) {
      this.inventoryForm.markAllAsTouched();
      return;
    }

    const { productId, quantity, expiryDate, sourceName } =
      this.inventoryForm.getRawValue();

    if (quantity === null) {
      return;
    }

    this.saving = true;

    const payload = {
      productId,
      quantity,
      expiryDate: expiryDate || null,
      sourceName: sourceName.trim() || null,
    };

    this.inventoryService.update(this.batchId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success('Batch updated successfully.', 'Success');
        this.router.navigate(['/inventory']);
      },
      error: (error) => {
        queueMicrotask(() => {
          this.saving = false;
          this.errorMessage = error.message ?? 'Failed to update batch.';
          this.toastr.error(this.errorMessage, 'Error');
        });
      },
    });
  }

  private initializeForm(data: BatchFormData): void {
    const { batch, product } = data.batch;

    this.inventoryForm.patchValue(
      {
        batchNumber: batch.batchNumber,
        productId: product.id,
        quantity: batch.displayQuantity,
        expiryDate: batch.expiryDate?.slice(0, 10) ?? '',
        sourceName: batch.sourceName ?? '',
      },
      { emitEvent: false },
    );
    this.inventoryForm.controls.batchNumber.disable({ emitEvent: false });
    this.updateQuantityValidators();
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
