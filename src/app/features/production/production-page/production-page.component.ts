import { Component, inject, resource, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { PaginationComponent } from 'src/app/theme/shared/components/pagination/pagination.component';
import { SortableHeaderComponent } from 'src/app/theme/shared/components/sortable-header/sortable-header.component';
import { TableIconActionComponent } from 'src/app/theme/shared/components/table-icon-action/table-icon-action.component';
import { SortOrder } from 'src/app/theme/shared/models/sort-order.enum';
import { nextTableSort } from 'src/app/theme/shared/utils/table-sort.util';
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
import {
  expiryDateValidators,
  getTodayDateString,
} from 'src/app/theme/shared/utils/date.util';

@Component({
  selector: 'app-production-page',
  imports: [RouterModule, ReactiveFormsModule, TitleCasePipe, PaginationComponent, SortableHeaderComponent, TableIconActionComponent],
  providers: [TitleCasePipe],
  templateUrl: './production-page.component.html',
  styleUrl: './production-page.component.scss',
})
export class ProductionPageComponent {
  private fb = inject(FormBuilder);
  private titleCasePipe = inject(TitleCasePipe);
  private recipeService = inject(RecipeService);
  private productionService = inject(ProductionService);
  private productService = inject(ProductService);
  private toastr = inject(ToastrService);
  private router = inject(Router);

  activeTab: 'recipes' | 'run' = 'recipes';
  recipePage = signal(1);
  recipeLimit = signal(10);
  recipeSortBy = signal<string | undefined>(undefined);
  recipeSortOrder = signal<SortOrder | undefined>(undefined);
  deletingRecipeId = signal<string | null>(null);
  submitted = false;
  saving = false;
  errorMessage = '';
  lastResult: ProductionResult | null = null;
  readonly minExpiryDate = getTodayDateString();

  pageDataResource = resource({
    params: () => ({
      page: this.recipePage(),
      limit: this.recipeLimit(),
      sortBy: this.recipeSortBy(),
      sortOrder: this.recipeSortOrder(),
    }),
    loader: async ({ params }) => {
      const [recipeResponse, products, allRecipes] = await Promise.all([
        firstValueFrom(this.recipeService.get(params)),
        this.productService.getAllItems(),
        this.recipeService.getAllItems(),
      ]);

      return {
        recipes: recipeResponse.data.items,
        recipeMeta: recipeResponse.data.meta,
        allRecipes,
        products: new Map(products.map((product) => [product._id, product])),
      };
    },
  });

  productionForm = this.fb.nonNullable.group({
    recipeId: ['', Validators.required],
    outputQuantity: [null as number | null, [Validators.required, Validators.min(0.001)]],
    expiryDate: ['', expiryDateValidators(this.minExpiryDate)],
    remarks: [''],
  });

  get f() {
    return this.productionForm.controls;
  }

  get recipes(): Recipe[] {
    return this.pageDataResource.value()?.recipes ?? [];
  }

  get allRecipes(): Recipe[] {
    return this.pageDataResource.value()?.allRecipes ?? [];
  }

  get products(): Map<string, Product> {
    return this.pageDataResource.value()?.products ?? new Map();
  }

  get selectedRecipe(): Recipe | undefined {
    const recipeId = this.productionForm.controls.recipeId.value;
    return this.allRecipes.find((recipe) => recipe._id === recipeId);
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

  onRecipePageChange(page: number): void {
    this.recipePage.set(page);
  }

  onRecipeSort(column: string): void {
    const next = nextTableSort(
      { sortBy: this.recipeSortBy(), sortOrder: this.recipeSortOrder() },
      column,
    );
    this.recipeSortBy.set(next.sortBy);
    this.recipeSortOrder.set(next.sortOrder);
    this.recipePage.set(1);
  }

  runProductionForRecipe(recipeId: string): void {
    this.activeTab = 'run';
    this.productionForm.patchValue({ recipeId });
    this.lastResult = null;
    this.errorMessage = '';
  }

  deleteRecipe(id: string, name: string): void {
    if (!confirm(`Delete recipe "${name}"? This cannot be undone.`)) {
      return;
    }

    this.deletingRecipeId.set(id);

    this.recipeService.delete(id).subscribe({
      next: () => {
        this.deletingRecipeId.set(null);
        this.toastr.success('Recipe deleted successfully.', 'Success');
        this.pageDataResource.reload();
      },
      error: (error) => {
        this.deletingRecipeId.set(null);
        this.toastr.error(error.message ?? 'Failed to delete recipe.', 'Error');
      },
    });
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
        const productName = this.titleCasePipe.transform(
          this.getProductName(ingredient.productId),
        );
        return `${productName} (${ingredient.quantity} ${unit})`;
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
        this.toastr.success('Production completed successfully.', 'Success');
        this.router.navigate(['/transactions'], {
          queryParams: { view: response.data.transactionId },
        });
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error.message ?? 'Failed to run production.';
        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }
}
