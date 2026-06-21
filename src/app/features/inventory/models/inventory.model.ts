import { BatchType } from './batch-type.enum';
import { ProductType } from '../../products/models/product-type.enum';
import { ProductUnit } from '../../products/models/product-unit.enum';

export interface Inventory {
  _id: string;
  batchNumber: string;
  productId: string;
  quantity: number;
  remainingQuantity: number;
  batchType: BatchType;
  expiryDate?: string;
  sourceName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInventory {
  productId: string;
  quantity: number;
  batchType?: BatchType;
  expiryDate?: string;
  sourceName?: string;
}

export interface UpdateInventory {
  batchNumber?: string;
  productId?: string;
  quantity?: number;
  expiryDate?: string | null;
  sourceName?: string | null;
}

export interface CreateConversion {
  sourceBatchId: string;
  finishedProductId: string;
  quantity: number;
  expiryDate?: string;
  remarks?: string;
}

export interface ConversionResult {
  sourceBatch: {
    id: string;
    batchNumber: string;
    remainingQuantity: number;
  };
  producedBatch: BatchLookup;
  consumedQuantity: number;
  outputQuantity: number;
  transactionId: string;
}

export interface BatchLookup {
  batch: {
    id: string;
    batchNumber: string;
    batchType: BatchType;
    expiryDate?: string | null;
    sourceName?: string | null;
    remainingQuantity: number;
    displayRemainingQuantity: number;
    quantity: number;
    displayQuantity: number;
    isExpired: boolean;
    canSell: boolean;
  };
  product: {
    id: string;
    name: string;
    type: ProductType;
    unit: ProductUnit;
    isActive: boolean;
  };
}
