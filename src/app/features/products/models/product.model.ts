import { ProductType } from './product-type.enum';
import { ProductUnit } from './product-unit.enum';

export interface Product {
  _id: string;
  name: string;
  type: ProductType;
  unit: ProductUnit;
  lowStockAlert: number;
  createdBy: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProduct {
  name: string;
  type: ProductType;
  unit: ProductUnit;
}
