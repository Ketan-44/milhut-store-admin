import { Component, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { resource } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { Product } from '../../products/models/product.model';
import { ProductType } from '../../products/models/product-type.enum';
import { ProductUnit } from '../../products/models/product-unit.enum';
import { ProductService } from '../../products/services/product.service';
import {
  getQuantityLabel,
  getQuantityMin,
  getQuantityPlaceholder,
  getQuantityStep,
  isValidDisplayQuantity,
} from '../../inventory/utils/quantity.util';
import { RecipeService } from '../services/recipe.service';

type IngredientFormGroup = FormGroup<{
  productId: FormControl<string>;
  quantity: FormControl<number | null>;
}>;

@Component({
  selector: 'app-recipe-form',
  imports: [RouterModule, ReactiveFormsModule],
  templateUrl: './recipe-form.component.html',
  styleUrl: './recipe-form.component.scss',
})
export class RecipeFormComponent {
  private fb = inject(FormBuilder);
  private recipeService = inject(RecipeService);
  private productService = inject(ProductService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  submitted = false;
  saving = false;
  errorMessage = '';

  formDataResource = resource({
    loader: async () => {
      const response = await firstValueFrom(this.productService.get());

      return {
        finishedProducts: response.data.filter(
          (product) => product.type === ProductType.FINISHED,
        ),
        ingredientProducts: response.data,
      };
    },
  });

  recipeForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    finishedProductId: ['', Validators.required],
    ingredients: this.fb.array([this.createIngredientGroup()]),
  });

  get f() {
    return this.recipeForm.controls;
  }

  get ingredients(): FormArray<IngredientFormGroup> {
    return this.recipeForm.controls.ingredients;
  }

  get finishedProducts(): Product[] {
    return this.formDataResource.value()?.finishedProducts ?? [];
  }

  get ingredientProducts(): Product[] {
    return this.formDataResource.value()?.ingredientProducts ?? [];
  }

  getIngredientGroup(index: number): IngredientFormGroup {
    return this.ingredients.at(index);
  }

  createIngredientGroup(): IngredientFormGroup {
    return this.fb.nonNullable.group({
      productId: ['', Validators.required],
      quantity: [null as number | null, [Validators.required, Validators.min(0.001)]],
    });
  }

  addIngredient(): void {
    this.ingredients.push(this.createIngredientGroup());
  }

  removeIngredient(index: number): void {
    if (this.ingredients.length > 1) {
      this.ingredients.removeAt(index);
    }
  }

  getProductUnit(productId: string): ProductUnit | undefined {
    return this.ingredientProducts.find((product) => product._id === productId)?.unit;
  }

  getQuantityStep(productId: string): string {
    return getQuantityStep(this.getProductUnit(productId) ?? ProductUnit.PIECE);
  }

  getQuantityPlaceholder(productId: string): string {
    return getQuantityPlaceholder(this.getProductUnit(productId) ?? ProductUnit.PIECE);
  }

  getIngredientQuantityLabel(productId: string): string {
    return getQuantityLabel('Qty per output', this.getProductUnit(productId));
  }

  getIngredientQuantityMin(productId: string): number {
    return getQuantityMin(this.getProductUnit(productId) ?? ProductUnit.PIECE);
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.recipeForm.invalid) {
      this.recipeForm.markAllAsTouched();
      return;
    }

    const { name, finishedProductId, ingredients } = this.recipeForm.getRawValue();

    for (const item of ingredients) {
      const unit = this.getProductUnit(item.productId);

      if (!unit || item.quantity == null) {
        continue;
      }

      if (!isValidDisplayQuantity(item.quantity, unit)) {
        this.errorMessage =
          unit === ProductUnit.PIECE
            ? 'Ingredient quantities for piece products must be whole numbers.'
            : 'Ingredient quantity must be greater than zero.';
        return;
      }
    }

    const payload = {
      name,
      finishedProductId,
      ingredients: ingredients.map((item) => ({
        productId: item.productId,
        quantity: item.quantity!,
      })),
    };

    this.saving = true;

    this.recipeService.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success('Recipe created successfully.', 'Success');
        this.router.navigate(['/production']);
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error.message ?? 'Failed to create recipe.';
        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }
}
