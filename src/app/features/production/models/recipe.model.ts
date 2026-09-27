import { ProductUnit } from '../../products/models/product-unit.enum';

export interface RecipeIngredient {
  productId?: string;
  recipeId?: string;
  quantity: number;
}

export type RecipeKind = 'PRODUCT' | 'SEMI_RECIPE';

export interface Recipe {
  _id: string;
  name: string;
  recipeKind?: RecipeKind;
  finishedProductId?: string;
  yieldQuantity?: number;
  yieldUnit?: ProductUnit;
  ingredients: RecipeIngredient[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRecipe {
  name: string;
  recipeKind?: RecipeKind;
  finishedProductId?: string;
  yieldQuantity?: number;
  yieldUnit?: ProductUnit;
  ingredients?: RecipeIngredient[];
}

export interface UpdateRecipe {
  name?: string;
  recipeKind?: RecipeKind;
  finishedProductId?: string;
  yieldQuantity?: number;
  yieldUnit?: ProductUnit;
  ingredients?: RecipeIngredient[];
}
