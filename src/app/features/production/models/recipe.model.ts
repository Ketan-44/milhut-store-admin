export interface RecipeIngredient {
  productId: string;
  quantity: number;
}

export interface Recipe {
  _id: string;
  name: string;
  finishedProductId: string;
  ingredients: RecipeIngredient[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRecipe {
  name: string;
  finishedProductId: string;
  ingredients?: RecipeIngredient[];
}

export interface UpdateRecipe {
  name?: string;
  finishedProductId?: string;
  ingredients?: RecipeIngredient[];
}
