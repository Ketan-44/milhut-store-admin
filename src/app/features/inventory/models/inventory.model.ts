import { BatchType } from './batch-type.enum';
import { ProductType } from '../../products/models/product-type.enum';
import { ProductUnit } from '../../products/models/product-unit.enum';

export interface Inventory {
  _id: string;
  batchNumber: string;
  productId: string;
  quantity: number;
  remainingQuantity: number;
  parentBatch?: string;
  batchType: BatchType;
  expiryDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInventory {
  productId: string;
  quantity: number;
  parentBatch?: string;
  batchType?: BatchType;
  expiryDate: string;
}

export interface BatchLookup {
  batch: {
    id: string;
    batchNumber: string;
    batchType: BatchType;
    expiryDate: string;
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
