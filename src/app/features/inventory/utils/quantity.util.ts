import { ProductUnit } from '../../products/models/product-unit.enum';

export function toStorageQuantity(quantity: number, unit: ProductUnit): number {
  if (unit === ProductUnit.KG) {
    return quantity * 1000;
  }
  return quantity;
}

export function toDisplayQuantity(quantity: number, unit: ProductUnit): number {
  if (unit === ProductUnit.KG) {
    return quantity / 1000;
  }
  return quantity;
}

export function getQuantityStep(unit: ProductUnit): string {
  if (unit === ProductUnit.KG) {
    return '0.001';
  }
  return '1';
}

export function getQuantityPlaceholder(unit: ProductUnit): string {
  switch (unit) {
    case ProductUnit.KG:
      return 'e.g. 1.5';
    case ProductUnit.GRAM:
      return 'e.g. 500';
    case ProductUnit.PIECE:
      return 'e.g. 10';
  }
}
