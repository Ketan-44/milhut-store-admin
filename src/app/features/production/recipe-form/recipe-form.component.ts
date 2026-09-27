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
import { NgSelectModule } from '@ng-select/ng-select';
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
import { Recipe, RecipeKind } from '../models/recipe.model';
import { RecipeService } from '../services/recipe.service';
import { NoSpecialCharLabelPipe } from 'src/app/theme/shared/pipes/noSpecialCharLabel.pipe';

type IngredientKind = 'PRODUCT' | 'SEMI_RECIPE';

type IngredientFormGroup = FormGroup<{
  ingredientKind: FormControl<IngredientKind>;
  productId: FormControl<string>;
  recipeId: FormControl<string>;
  quantity: FormControl<number | null>;
}>;

@Component({
  selector: 'app-recipe-form',
  imports: [RouterModule, ReactiveFormsModule, TitleCasePipe, NoSpecialCharLabelPipe, NgSelectModule],
  templateUrl: './recipe-form.component.html',
  styleUrl: './recipe-form.component.scss',
})
export class RecipeFormComponent implements OnInit {
  readonly ProductUnit = ProductUnit;

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
  private yieldManuallyOverridden = false;

  formDataResource = resource({
    loader: async () => {
      const [products, recipes] = await Promise.all([
        this.productService.getAllItems(),
        this.recipeService.getAllItems(),
      ]);

      return {
        finishedProducts: products.filter(
          (product) =>
            // product.type === ProductType.SEMI_FINISHED ||
            product.type === ProductType.FINISHED,
        ),
        ingredientProducts: products,
        semiRecipes: recipes.filter(
          (recipe) =>
            (recipe.recipeKind ?? 'PRODUCT') === 'SEMI_RECIPE' &&
            recipe._id !== this.recipeId,
        ),
      };
    },
  });

  recipeForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    recipeKind: this.fb.nonNullable.control<RecipeKind>('PRODUCT'),
    finishedProductId: this.fb.control<string | null>(null, Validators.required),
    yieldQuantity: this.fb.control<number | null>(null),
    yieldUnit: this.fb.control<ProductUnit | null>(null),
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

  get semiRecipes(): Recipe[] {
    return (this.formDataResource.value()?.semiRecipes ?? []).filter(
      (recipe) => recipe._id !== this.recipeId,
    );
  }

  getIngredientGroup(index: number): IngredientFormGroup {
    return this.ingredients.at(index);
  }

  createIngredientGroup(): IngredientFormGroup {
    return this.fb.nonNullable.group({
      ingredientKind: this.fb.nonNullable.control<IngredientKind>('PRODUCT'),
      productId: ['', Validators.required],
      recipeId: [''],
      quantity: [null as number | null, [Validators.required, Validators.min(0.001)]],
    });
  }

  setRecipeKind(kind: RecipeKind): void {
    this.recipeForm.controls.recipeKind.setValue(kind);
    const finishedProduct = this.recipeForm.controls.finishedProductId;
    const yieldQuantity = this.recipeForm.controls.yieldQuantity;
    const yieldUnit = this.recipeForm.controls.yieldUnit;

    if (kind === 'PRODUCT') {
      finishedProduct.setValidators(Validators.required);
      yieldQuantity.clearValidators();
      yieldUnit.clearValidators();
    } else {
      finishedProduct.clearValidators();
      finishedProduct.setValue(null);
      yieldQuantity.setValidators([Validators.required, Validators.min(0.001)]);
      yieldUnit.setValidators(Validators.required);
      if (!yieldUnit.value) {
        yieldUnit.setValue(ProductUnit.WEIGHT);
      }
    }

    finishedProduct.updateValueAndValidity();
    yieldQuantity.updateValueAndValidity();
    yieldUnit.updateValueAndValidity();
    this.updateYieldFromIngredientTotal();
  }

  setIngredientKind(index: number, kind: IngredientKind): void {
    const ingredient = this.getIngredientGroup(index);
    ingredient.controls.ingredientKind.setValue(kind);
    if (kind === 'PRODUCT') {
      ingredient.controls.productId.setValidators(Validators.required);
      ingredient.controls.recipeId.clearValidators();
      ingredient.controls.recipeId.setValue('');
    } else {
      ingredient.controls.productId.clearValidators();
      ingredient.controls.productId.setValue('');
      ingredient.controls.recipeId.setValidators(Validators.required);
    }
    ingredient.controls.productId.updateValueAndValidity();
    ingredient.controls.recipeId.updateValueAndValidity();
    this.updateYieldFromIngredientTotal();
  }

  addIngredient(): void {
    this.ingredients.push(this.createIngredientGroup());
    this.updateYieldFromIngredientTotal();
  }

  removeIngredient(index: number): void {
    if (this.ingredients.length > 1) {
      this.ingredients.removeAt(index);
      this.updateYieldFromIngredientTotal();
    }
  }

  onYieldQuantityInput(): void {
    this.yieldManuallyOverridden = true;
  }

  useIngredientTotal(): void {
    this.yieldManuallyOverridden = false;
    this.updateYieldFromIngredientTotal();
  }

  updateYieldFromIngredientTotal(): void {
    if (
      this.recipeForm.controls.recipeKind.value !== 'SEMI_RECIPE' ||
      this.yieldManuallyOverridden
    ) {
      return;
    }

    const total = this.getIngredientTotalForYield();
    this.recipeForm.controls.yieldQuantity.setValue(total, { emitEvent: false });
  }

  getIngredientTotalForYield(): number | null {
    const yieldUnit = this.recipeForm.controls.yieldUnit.value;
    if (!yieldUnit || !this.ingredients.length) {
      return null;
    }

    let total = 0;
    for (let index = 0; index < this.ingredients.length; index += 1) {
      const ingredient = this.getIngredientGroup(index);
      const unit = this.getConfiguredIngredientUnit(index);
      const quantity = ingredient.controls.quantity.value;
      if (!unit || unit !== yieldUnit || quantity == null || quantity <= 0) {
        return null;
      }
      total += quantity;
    }

    return Number(total.toFixed(6));
  }

  private getConfiguredIngredientUnit(index: number): ProductUnit | undefined {
    const ingredient = this.getIngredientGroup(index);
    if (ingredient.controls.ingredientKind.value === 'SEMI_RECIPE') {
      return this.semiRecipes.find(
        (recipe) => recipe._id === ingredient.controls.recipeId.value,
      )?.yieldUnit;
    }
    const productId = ingredient.controls.productId.value;
    return productId ? this.getProductUnit(productId) : undefined;
  }

  getProductUnit(productId: string): ProductUnit | undefined {
    return this.ingredientProducts.find((product) => product._id === productId)?.unit;
  }

  getQuantityStep(unit: ProductUnit): string {
    return getQuantityStep(unit);
  }

  getQuantityPlaceholder(unit: ProductUnit): string {
    return getQuantityPlaceholder(unit);
  }

  getQuantityMin(unit: ProductUnit): number {
    return getQuantityMin(unit);
  }

  getIngredientUnit(index: number): ProductUnit {
    const ingredient = this.getIngredientGroup(index);
    if (ingredient.controls.ingredientKind.value === 'SEMI_RECIPE') {
      return this.semiRecipes.find(
        (recipe) => recipe._id === ingredient.controls.recipeId.value,
      )?.yieldUnit ?? ProductUnit.WEIGHT;
    }
    return this.getProductUnit(ingredient.controls.productId.value) ?? ProductUnit.PIECE;
  }

  getIngredientQuantityLabelForRow(index: number): string {
    const prefix = this.recipeForm.controls.recipeKind.value === 'SEMI_RECIPE'
      ? 'Quantity in yield'
      : 'Quantity per output';
    return getQuantityLabel(prefix, this.getIngredientUnit(index));
  }

  getSemiRecipeYieldLabel(): string {
    return getQuantityLabel('Yield quantity', this.recipeForm.controls.yieldUnit.value ?? undefined);
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.recipeForm.invalid) {
      this.recipeForm.markAllAsTouched();
      return;
    }

    const {
      name,
      recipeKind,
      finishedProductId,
      yieldQuantity,
      yieldUnit,
      ingredients,
    } = this.recipeForm.getRawValue();

    for (const [index, item] of ingredients.entries()) {
      const unit = this.getIngredientUnit(index);

      if (item.quantity == null) {
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

    if (recipeKind === 'SEMI_RECIPE') {
      const unit = yieldUnit ?? ProductUnit.WEIGHT;
      if (!yieldQuantity || !isValidDisplayQuantity(yieldQuantity, unit)) {
        this.errorMessage = unit === ProductUnit.PIECE
          ? 'Semi-recipe yield must be a whole number of pieces.'
          : 'Semi-recipe yield must be greater than zero.';
        return;
      }
    }

    const payload = {
      name,
      recipeKind,
      ...(recipeKind === 'PRODUCT'
        ? { finishedProductId: finishedProductId! }
        : { yieldQuantity: yieldQuantity!, yieldUnit: yieldUnit! }),
      ingredients: ingredients.map((item) => ({
        ...(item.ingredientKind === 'PRODUCT'
          ? { productId: item.productId }
          : { recipeId: item.recipeId }),
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
    const recipeKind = recipe.recipeKind ?? 'PRODUCT';
    this.yieldManuallyOverridden =
      recipeKind === 'SEMI_RECIPE' && !options.copy;
    this.recipeForm.patchValue(
      {
        name: options.copy
          ? `Copy of ${recipe.name}`.slice(0, 100)
          : recipe.name,
        recipeKind,
        finishedProductId: recipe.finishedProductId,
        yieldQuantity: recipe.yieldQuantity ?? null,
        yieldUnit: recipe.yieldUnit ?? null,
      },
      { emitEvent: false },
    );
    this.setRecipeKind(recipeKind);

    this.ingredients.clear();

    for (const ingredient of recipe.ingredients ?? []) {
      const group = this.createIngredientGroup();
      if (ingredient.recipeId) {
        group.patchValue({
          ingredientKind: 'SEMI_RECIPE',
          recipeId: ingredient.recipeId,
          quantity: ingredient.quantity,
        });
        group.controls.productId.clearValidators();
        group.controls.recipeId.setValidators(Validators.required);
        group.controls.productId.updateValueAndValidity();
        group.controls.recipeId.updateValueAndValidity();
      } else {
        group.patchValue({
          ingredientKind: 'PRODUCT',
          productId: ingredient.productId ?? '',
          quantity: ingredient.quantity,
        });
      }
      this.ingredients.push(group);
    }

    if (this.ingredients.length === 0) {
      this.ingredients.push(this.createIngredientGroup());
    }
    this.updateYieldFromIngredientTotal();
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
