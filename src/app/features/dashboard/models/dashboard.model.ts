import { ProductUnit } from '../../products/models/product-unit.enum';
import { ProductType } from '../../products/models/product-type.enum';
import { Transaction } from '../../transactions/models/transaction.model';
import { PaginatedResult, PaginationQuery } from 'src/app/theme/shared/models/pagination.model';

export interface LiveInventoryItem {
  productId: string;
  productName: string;
  productType: ProductType;
  unit: ProductUnit;
  availableQuantity: number;
  displayAvailableQuantity: number;
  lowStockAlert: number;
  displayLowStockAlert: number;
  isLowStock: boolean;
  batchCount: number;
}

export type LiveInventoryResult = PaginatedResult<LiveInventoryItem>;

export interface DashboardDateRangeQuery extends PaginationQuery {
  startDate?: string;
  endDate?: string;
}

export interface DashboardProductionQuery extends DashboardDateRangeQuery {
  productId?: string;
  sourceBatchId?: string;
}

export type DashboardTransactionPage = PaginatedResult<Transaction>;

export interface SelectedPurchasedItem {
  productId: string;
  batchId: string;
  batchNumber: string;
  productName: string;
}

export type DashboardStatTrend = 'up' | 'down' | 'neutral';

export interface DashboardStatItem {
  title: string;
  value: number;
  trend: DashboardStatTrend;
  changePercent: number;
  footerHighlight: number;
  footerText: string;
}

export interface DashboardStatsResult {
  productsInStock: DashboardStatItem;
  purchased: DashboardStatItem;
  production: DashboardStatItem;
  sales: DashboardStatItem;
}
