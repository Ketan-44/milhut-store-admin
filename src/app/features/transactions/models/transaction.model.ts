import { ProductType } from '../../products/models/product-type.enum';
import { ProductUnit } from '../../products/models/product-unit.enum';
import { TransactionType } from './transaction-type.enum';

export interface TransactionProduct {
  _id: string;
  name: string;
  type: ProductType;
  unit: ProductUnit;
}

export interface TransactionBatch {
  _id: string;
  batchNumber: string;
  batchType: string;
  remainingQuantity: number;
}

export interface TransactionUser {
  _id: string;
  name: string;
  email: string;
}

export interface Transaction {
  _id: string;
  type: TransactionType;
  product: string | TransactionProduct;
  batch?: string | TransactionBatch;
  quantity: number;
  performedBy?: string | TransactionUser;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSale {
  batch?: string;
  qrCode?: string;
  quantity: number;
  remarks?: string;
}
