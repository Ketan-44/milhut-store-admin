import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ProductUnit } from '../../products/models/product-unit.enum';

const GRAMS_PER_KG = 1000;

export function isWeightUnit(unit: ProductUnit): boolean {
  return unit === ProductUnit.WEIGHT || unit === ProductUnit.GMS;
}

export function isValidDisplayQuantity(
  quantity: number,
  unit: ProductUnit,
): boolean {
  if (unit === ProductUnit.PIECE) {
    return Number.isInteger(quantity) && quantity > 0;
  }

  return quantity > 0;
}

export function toStorageQuantity(quantity: number, unit: ProductUnit): number {
  if (unit === ProductUnit.WEIGHT) {
    return quantity * GRAMS_PER_KG;
  }

  if (unit === ProductUnit.GMS) {
    return quantity;
  }

  return quantity;
}

export function toDisplayQuantity(quantity: number, unit: ProductUnit): number {
  if (unit === ProductUnit.WEIGHT) {
    return quantity / GRAMS_PER_KG;
  }

  if (unit === ProductUnit.GMS) {
    return quantity;
  }

  return quantity;
}

export function getQuantityStep(unit: ProductUnit): string {
  if (unit === ProductUnit.WEIGHT) {
    return '0.001';
  }

  if (unit === ProductUnit.GMS) {
    return '1';
  }

  return '1';
}

export function getQuantityMin(unit: ProductUnit): number {
  if (unit === ProductUnit.PIECE) {
    return 1;
  }

  return 0.001;
}

export function getQuantityPlaceholder(unit: ProductUnit): string {
  if (unit === ProductUnit.WEIGHT) {
    return 'e.g. 1.5';
  }

  if (unit === ProductUnit.GMS) {
    return 'e.g. 250';
  }

  return 'e.g. 10';
}

export function getUnitDisplayLabel(unit: ProductUnit): string {
  if (unit === ProductUnit.WEIGHT) {
    return 'kg';
  }

  if (unit === ProductUnit.GMS) {
    return 'gms';
  }

  return 'Piece';
}

export function getQuantityHint(unit: ProductUnit): string {
  if (unit === ProductUnit.WEIGHT) {
    return 'Enter quantity in kilograms (e.g. 1, 1.5, 2.25).';
  }

  if (unit === ProductUnit.GMS) {
    return 'Enter quantity in grams (e.g. 50, 250, 1000).';
  }

  return 'Enter quantity in whole pieces (e.g. 1, 10).';
}

export function getQuantityLabel(prefix = 'Quantity', unit?: ProductUnit): string {
  if (!unit) {
    return prefix;
  }

  return `${prefix} (${getUnitDisplayLabel(unit)})`;
}

export function formatDisplayQuantity(
  quantity: number,
  unit: ProductUnit,
): string {
  const display = toDisplayQuantity(quantity, unit);
  return `${display} ${getUnitDisplayLabel(unit)}`;
}

export function pieceQuantityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (value == null || value === '') {
      return null;
    }

    return Number.isInteger(Number(value)) ? null : { integer: true };
  };
}
