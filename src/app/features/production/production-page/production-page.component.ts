import { Component, inject, resource } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { Product } from '../../products/models/product.model';
import { ProductUnit } from '../../products/models/product-unit.enum';
import { ProductService } from '../../products/services/product.service';
import {
  formatDisplayQuantity,
  getQuantityHint,
  getQuantityLabel,
  getQuantityMin,
  getQuantityPlaceholder,
  getQuantityStep,
  getUnitDisplayLabel,
} from '../../inventory/utils/quantity.util';
import { Recipe } from '../models/recipe.model';
import { ProductionResult } from '../models/production.model';
import { ProductionService } from '../services/production.service';
import { RecipeService } from '../services/recipe.service';

@Component({
  selector: 'app-production-page',
  imports: [RouterModule, ReactiveFormsModule],
  templateUrl: './production-page.component.html',
  styleUrl: './production-page.component.scss',
})
export class ProductionPageComponent {
  private fb = inject(FormBuilder);
  private recipeService = inject(RecipeService);
  private productionService = inject(ProductionService);
  private productService = inject(ProductService);
  private toastr = inject(ToastrService);

  activeTab: 'recipes' | 'run' = 'recipes';
  submitted = false;
  saving = false;
  errorMessage = '';
  lastResult: ProductionResult | null = null;

  pageDataResource = resource({
    loader: async () => {
      const [recipeResponse, productResponse] = await Promise.all([
        firstValueFrom(this.recipeService.get()),
        firstValueFrom(this.productService.get()),
      ]);

      return {
        recipes: recipeResponse.data,
        products: new Map(
          productResponse.data.map((product) => [product._id, product]),
        ),
      };
    },
  });

  productionForm = this.fb.nonNullable.group({
    recipeId: ['', Validators.required],
    outputQuantity: [null as number | null, [Validators.required, Validators.min(0.001)]],
    expiryDate: ['', Validators.required],
    remarks: [''],
  });

  get f() {
    return this.productionForm.controls;
  }

  get recipes(): Recipe[] {
    return this.pageDataResource.value()?.recipes ?? [];
  }

  get products(): Map<string, Product> {
    return this.pageDataResource.value()?.products ?? new Map();
  }

  get selectedRecipe(): Recipe | undefined {
    const recipeId = this.productionForm.controls.recipeId.value;
    return this.recipes.find((recipe) => recipe._id === recipeId);
  }

  get selectedFinishedProduct(): Product | undefined {
    const recipe = this.selectedRecipe;
    return recipe ? this.products.get(recipe.finishedProductId) : undefined;
  }

  get outputQuantityLabel(): string {
    return getQuantityLabel('Output Quantity', this.selectedFinishedProduct?.unit);
  }

  get outputQuantityMin(): number {
    return getQuantityMin(this.selectedFinishedProduct?.unit ?? ProductUnit.PIECE);
  }

  get outputQuantityStep(): string {
    return getQuantityStep(this.selectedFinishedProduct?.unit ?? ProductUnit.PIECE);
  }

  get outputQuantityPlaceholder(): string {
    return getQuantityPlaceholder(this.selectedFinishedProduct?.unit ?? ProductUnit.PIECE);
  }

  get outputQuantityHint(): string {
    const unit = this.selectedFinishedProduct?.unit;

    if (!unit) {
      return '';
    }

    return getQuantityHint(unit);
  }

  setTab(tab: 'recipes' | 'run'): void {
    this.activeTab = tab;
  }

  runProductionForRecipe(recipeId: string): void {
    this.activeTab = 'run';
    this.productionForm.patchValue({ recipeId });
    this.lastResult = null;
    this.errorMessage = '';
  }

  getProductName(productId: string): string {
    return this.products.get(productId)?.name ?? productId;
  }

  getIngredientUnitLabel(productId: string): string {
    const product = this.products.get(productId);

    if (!product) {
      return '';
    }

    return getUnitDisplayLabel(product.unit);
  }

  getIngredientDisplay(recipe: Recipe): string {
    if (!recipe.ingredients?.length) {
      return '—';
    }

    return recipe.ingredients
      .map((ingredient) => {
        const product = this.products.get(ingredient.productId);
        const unit = product ? getUnitDisplayLabel(product.unit) : '';
        return `${this.getProductName(ingredient.productId)} (${ingredient.quantity} ${unit})`;
      })
      .join(', ');
  }

  getDisplayQuantity(quantity: number, productId: string): string {
    const product = this.products.get(productId);
    if (!product) {
      return String(quantity);
    }

    return formatDisplayQuantity(quantity, product.unit);
  }

  onSubmitProduction(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.lastResult = null;

    if (this.productionForm.invalid) {
      this.productionForm.markAllAsTouched();
      return;
    }

    const { recipeId, outputQuantity, expiryDate, remarks } =
      this.productionForm.getRawValue();

    const payload = {
      recipeId,
      outputQuantity: outputQuantity!,
      expiryDate,
      ...(remarks ? { remarks } : {}),
    };

    this.saving = true;

    this.productionService.run(payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.lastResult = response.data;
        this.toastr.success('Production completed successfully.', 'Success');
        this.productionForm.patchValue({
          outputQuantity: null,
          expiryDate: '',
          remarks: '',
        });
        this.submitted = false;
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error.message ?? 'Failed to run production.';
        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }
}
