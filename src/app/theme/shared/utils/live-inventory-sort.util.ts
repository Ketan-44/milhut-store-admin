import { LiveInventoryItem } from 'src/app/features/dashboard/models/dashboard.model';
import { SortOrder } from '../models/sort-order.enum';

export function sortLiveInventoryItems(
  items: LiveInventoryItem[],
  sortBy?: string,
  sortOrder?: SortOrder,
): LiveInventoryItem[] {
  if (!sortBy) {
    return items;
  }

  const direction = sortOrder === SortOrder.ASC ? 1 : -1;

  return [...items].sort((left, right) => {
    const leftValue = getLiveInventorySortValue(left, sortBy);
    const rightValue = getLiveInventorySortValue(right, sortBy);

    if (typeof leftValue === 'string' && typeof rightValue === 'string') {
      return leftValue.localeCompare(rightValue) * direction;
    }

    if (typeof leftValue === 'boolean' && typeof rightValue === 'boolean') {
      return (leftValue === rightValue ? 0 : leftValue ? 1 : -1) * direction;
    }

    return ((leftValue as number) - (rightValue as number)) * direction;
  });
}

function getLiveInventorySortValue(
  item: LiveInventoryItem,
  sortBy: string,
): string | number | boolean {
  switch (sortBy) {
    case 'productName':
      return item.productName;
    case 'productType':
      return item.productType;
    case 'displayAvailableQuantity':
      return item.displayAvailableQuantity;
    case 'displayLowStockAlert':
      return item.displayLowStockAlert;
    case 'batchCount':
      return item.batchCount;
    case 'isLowStock':
      return item.isLowStock;
    default:
      return item.productName;
  }
}
