import { ProductUnit } from '../../products/models/product-unit.enum';
import {
    getUnitDisplayLabel,
    isWeightUnit,
    toDisplayQuantity,
    toStorageQuantity,
} from './quantity.util';

describe('quantity util', () => {
    it('should treat GMS as a weight unit and convert correctly', () => {
        expect(isWeightUnit(ProductUnit.GMS)).toBeTrue();
        expect(getUnitDisplayLabel(ProductUnit.GMS)).toBe('gms');
        expect(toStorageQuantity(250, ProductUnit.GMS)).toBe(250);
        expect(toDisplayQuantity(250, ProductUnit.GMS)).toBe(250);
    });
});
