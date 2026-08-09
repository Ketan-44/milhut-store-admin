import { ChangeDetectorRef, Component, computed, inject, OnInit, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
import { Recipe } from '../models/recipe.model';
import { RecipeService } from '../services/recipe.service';
import { NoSpecialCharLabelPipe } from 'src/app/theme/shared/pipes/noSpecialCharLabel.pipe';

type IngredientFormGroup = FormGroup<{
  productId: FormControl<string>;
  quantity: FormControl<number | null>;
}>;

@Component({
  selector: 'app-recipe-form',
  imports: [RouterModule, ReactiveFormsModule, TitleCasePipe, NoSpecialCharLabelPipe],
  templateUrl: './recipe-form.component.html',
  styleUrl: './recipe-form.component.scss',
})
export class RecipeFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private recipeService = inject(RecipeService);
  private productService = inject(ProductService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  recipeId: string | null = null;
  isEditMode = false;
  isCopyMode = false;
  copiedFromName = '';
  loadingRecipe = signal(false);

  isFormLoading = computed(
    () =>
      this.loadingRecipe() ||
      (this.formDataResource.isLoading() && !this.formDataResource.hasValue()),
  );

  canShowForm = computed(
    () => this.formDataResource.hasValue() && !this.loadingRecipe(),
  );

  submitted = false;
  saving = false;
  errorMessage = '';

  formDataResource = resource({
    loader: async () => {
      const products = await this.productService.getAllItems();

      return {
        finishedProducts: products.filter(
          (product) =>
            // product.type === ProductType.SEMI_FINISHED ||
            product.type === ProductType.FINISHED,
        ),
        ingredientProducts: products,
        // ingredientProducts: products.filter(
        //   (product) =>
        //     product.type === ProductType.RAW ||
        //     product.type === ProductType.SEMI_FINISHED ||
        //     product.type === ProductType.FINISHED,
        // ),
      };
    },
  });

  recipeForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    finishedProductId: ['', Validators.required],
    ingredients: this.fb.array([this.createIngredientGroup()]),
  });

  ngOnInit(): void {
    this.recipeId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.recipeId;
    const copyFromId = this.route.snapshot.queryParamMap.get('copyFrom');
    this.isCopyMode = !this.isEditMode && !!copyFromId;

    if (this.isEditMode && this.recipeId) {
      this.loadRecipe(this.recipeId, { copy: false });
      return;
    }

    if (copyFromId) {
      this.loadRecipe(copyFromId, { copy: true });
    }
  }

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

    const request$ =
      this.isEditMode && this.recipeId
        ? this.recipeService.update(this.recipeId, payload)
        : this.recipeService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(
          this.isEditMode ? 'Recipe updated successfully.' : 'Recipe created successfully.',
          'Success',
        );
        this.router.navigate(['/production']);
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage =
          error.message ??
          (this.isEditMode ? 'Failed to update recipe.' : 'Failed to create recipe.');
        this.toastr.error(this.errorMessage, 'Error');
        this.cdr.markForCheck();
      },
    });
  }

  private loadRecipe(id: string, options: { copy: boolean }): void {
    this.loadingRecipe.set(true);

    void this.waitForFormData()
      .then(() => firstValueFrom(this.recipeService.getById(id)))
      .then((response) => {
        if (options.copy) {
          this.copiedFromName = response.data.name;
        }

        this.applyRecipeToForm(response.data, options);
        this.loadingRecipe.set(false);
        this.cdr.markForCheck();
      })
      .catch((error: unknown) => {
        this.loadingRecipe.set(false);
        this.handleLoadError(error, 'Failed to load recipe.');
        this.cdr.markForCheck();
      });
  }

  private waitForFormData(): Promise<void> {
    if (this.formDataResource.hasValue()) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const check = (): void => {
        if (this.formDataResource.hasValue()) {
          resolve();
          return;
        }

        if (this.formDataResource.error()) {
          reject(this.formDataResource.error());
          return;
        }

        window.setTimeout(check, 0);
      };

      check();
    });
  }

  private applyRecipeToForm(recipe: Recipe, options: { copy: boolean }): void {
    this.recipeForm.patchValue(
      {
        name: options.copy
          ? `Copy of ${recipe.name}`.slice(0, 100)
          : recipe.name,
        finishedProductId: recipe.finishedProductId,
      },
      { emitEvent: false },
    );

    this.ingredients.clear();

    for (const ingredient of recipe.ingredients ?? []) {
      this.ingredients.push(
        this.fb.nonNullable.group({
          productId: [ingredient.productId, Validators.required],
          quantity: [ingredient.quantity, [Validators.required, Validators.min(0.001)]],
        }),
      );
    }

    if (this.ingredients.length === 0) {
      this.ingredients.push(this.createIngredientGroup());
    }
  }

  private handleLoadError(error: unknown, fallbackMessage: string): void {
    this.errorMessage =
      error instanceof Error
        ? error.message
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message: string }).message)
          : fallbackMessage;
    this.toastr.error(this.errorMessage, 'Error');
  }
}
