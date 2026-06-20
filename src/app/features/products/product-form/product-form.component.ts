import { Component, DestroyRef, effect, inject, resource } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductType } from '../models/product-type.enum';
import { ProductUnit } from '../models/product-unit.enum';
import { ProductService } from '../services/product.service';
import {
  getQuantityHint,
  getQuantityLabel,
  getQuantityMin,
  getQuantityPlaceholder,
  getQuantityStep,
  pieceQuantityValidator,
  toDisplayQuantity,
} from '../../inventory/utils/quantity.util';

@Component({
  selector: 'app-product-form',
  imports: [RouterModule, ReactiveFormsModule, TitleCasePipe],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
})
export class ProductFormComponent {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);
  private destroyRef = inject(DestroyRef);

  private readonly productId = this.route.snapshot.paramMap.get('id');

  productTypes = Object.values(ProductType);
  productUnits = Object.values(ProductUnit);
  isEditMode = !!this.productId;

  productResource = resource({
    params: () => ({ productId: this.productId }),
    loader: async ({ params }) => {
      if (!params.productId) {
        return null;
      }

      const response = await firstValueFrom(
        this.productService.getById(params.productId),
      );

      return response.data;
    },
  });

  productForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    type: [ProductType.RAW, Validators.required],
    unit: [ProductUnit.WEIGHT, Validators.required],
    lowStockAlert: [null as number | null, [Validators.min(0)]],
    isActive: this.fb.control<boolean | null>(null),
  });

  submitted = false;
  saving = false;
  errorMessage = '';

  constructor() {
    effect(() => {
      const product = this.productResource.value();

      if (!product) {
        return;
      }

      this.productForm.patchValue(
        {
          name: product.name,
          type: product.type,
          unit: product.unit,
          lowStockAlert:
            product.lowStockAlert > 0
              ? toDisplayQuantity(product.lowStockAlert, product.unit)
              : null,
          isActive: product.isActive,
        },
        { emitEvent: false },
      );
      this.updateMinimumQuantityValidators();
    });

    this.productForm.controls.unit.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateMinimumQuantityValidators();
      });
  }

  get f() {
    return this.productForm.controls;
  }

  get showLoading(): boolean {
    return this.isEditMode && this.productResource.isLoading();
  }

  get showLoadError(): boolean {
    return this.isEditMode && !!this.productResource.error();
  }

  get showForm(): boolean {
    return !this.isEditMode || this.productResource.hasValue();
  }

  get loadErrorMessage(): string {
    const error = this.productResource.error();

    if (error instanceof Error) {
      return error.message;
    }

    return 'Failed to load product.';
  }

  get minimumQuantityLabel(): string {
    return getQuantityLabel('Minimum quantity', this.productForm.controls.unit.value);
  }

  get minimumQuantityStep(): string {
    return getQuantityStep(this.productForm.controls.unit.value);
  }

  get minimumQuantityMin(): number {
    return getQuantityMin(this.productForm.controls.unit.value);
  }

  get minimumQuantityPlaceholder(): string {
    return getQuantityPlaceholder(this.productForm.controls.unit.value);
  }

  get minimumQuantityHint(): string {
    return getQuantityHint(this.productForm.controls.unit.value);
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const { name, type, unit, lowStockAlert, isActive } = this.productForm.getRawValue();

    const payload = {
      name,
      type,
      unit,
      ...(lowStockAlert != null && lowStockAlert > 0 ? { lowStockAlert } : {}),
    };

    const request$ =
      this.isEditMode && this.productId
        ? this.productService.update(this.productId, {
            ...payload,
            isActive: isActive ?? true,
            ...(lowStockAlert == null || lowStockAlert === 0
              ? { lowStockAlert: 0 }
              : {}),
          })
        : this.productService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(
          this.isEditMode ? 'Product updated successfully.' : 'Product created successfully.',
          'Success',
        );
        this.router.navigate(['/products']);
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage =
          error.message ??
          (this.isEditMode ? 'Failed to update product.' : 'Failed to create product.');
        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }

  private updateMinimumQuantityValidators(): void {
    const control = this.productForm.controls.lowStockAlert;
    const unit = this.productForm.controls.unit.value;
    const validators = [Validators.min(0)];

    if (unit === ProductUnit.PIECE) {
      validators.push(pieceQuantityValidator());
    }

    control.setValidators(validators);
    control.updateValueAndValidity({ emitEvent: false });
  }
}
