export interface CreateProduction {
  recipeId: string;
  outputQuantity: number;
  expiryDate: string;
  remarks?: string;
}

export interface ProductionResult {
  recipe: {
    id: string;
    name: string;
  };
  producedBatch: {
    _id: string;
    batchNumber: string;
    productId: string;
    quantity: number;
    remainingQuantity: number;
    batchType: string;
    expiryDate: string;
  };
  outputQuantity: number;
  consumptions: Array<{
    productId: string;
    productName: string;
    batches: Array<{
      batchId: string;
      batchNumber: string;
      quantity: number;
    }>;
  }>;
}
