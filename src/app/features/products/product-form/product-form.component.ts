import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ProductType } from '../models/product-type.enum';
import { ProductUnit } from '../models/product-unit.enum';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-product-form',
  imports: [RouterModule, ReactiveFormsModule],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
})
export class ProductFormComponent {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  productTypes = Object.values(ProductType);
  productUnits = Object.values(ProductUnit);

  productForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    type: [ProductType.RAW, Validators.required],
    unit: [ProductUnit.WEIGHT, Validators.required],
  });

  submitted = false;
  saving = false;
  errorMessage = '';

  get f() {
    return this.productForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const payload = this.productForm.getRawValue();

    this.productService.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success('Product created successfully.', 'Success');
        this.router.navigate(['/products']);
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error.message ?? 'Failed to create product.';
        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }
}
