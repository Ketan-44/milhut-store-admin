import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import {
  formatDisplayQuantity,
  getUnitDisplayLabel,
} from '../../inventory/utils/quantity.util';
import { Product } from '../../products/models/product.model';
import { ProductUnit } from '../../products/models/product-unit.enum';
import { ProductService } from '../../products/services/product.service';
import { TransactionType } from '../models/transaction-type.enum';
import {
  Transaction,
  TransactionBatch,
  TransactionProduct,
  TransactionUser,
} from '../models/transaction.model';
import { TransactionService } from '../services/transaction.service';

@Component({
  selector: 'app-transaction-detail-modal',
  templateUrl: './transaction-detail-modal.component.html',
  styleUrl: './transaction-detail-modal.component.scss',
  imports: [DatePipe, TitleCasePipe],
})
export class TransactionDetailModalComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private productService = inject(ProductService);

  transactionId = input.required<string>();
  closed = output<void>();

  loading = signal(true);
  error = signal('');
  transaction = signal<Transaction | null>(null);
  products = signal<Map<string, Product>>(new Map());

  ngOnInit(): void {
    void this.loadTransaction();
  }

  close(): void {
    this.closed.emit();
  }

  getTypeBadgeClass(type: TransactionType): string {
    switch (type) {
      case TransactionType.SALE:
        return 'text-bg-danger';
      case TransactionType.IN:
        return 'text-bg-success';
      case TransactionType.PRODUCED:
        return 'text-bg-primary';
      default:
        return 'text-bg-secondary';
    }
  }

  getProduct(transaction: Transaction): TransactionProduct | undefined {
    return typeof transaction.product === 'string' ? undefined : transaction.product;
  }

  getBatch(transaction: Transaction): TransactionBatch | undefined {
    return transaction.batch && typeof transaction.batch !== 'string'
      ? transaction.batch
      : undefined;
  }

  getUser(transaction: Transaction): TransactionUser | undefined {
    return transaction.performedBy && typeof transaction.performedBy !== 'string'
      ? transaction.performedBy
      : undefined;
  }

  getTransactionQuantity(transaction: Transaction): string {
    const product = this.getProduct(transaction);

    if (!product) {
      return String(transaction.quantity);
    }

    return formatDisplayQuantity(transaction.quantity, product.unit);
  }

  getIngredientQuantity(productId: string, quantity: number): string {
    const product = this.products().get(productId);
    const unit = product?.unit ?? ProductUnit.PIECE;

    return `${formatDisplayQuantity(quantity, unit)}`;
  }

  getBatchQuantity(transaction: Transaction): string {
    const batch = this.getBatch(transaction);
    const product = this.getProduct(transaction);

    if (!batch?.quantity || !product) {
      return '—';
    }

    return formatDisplayQuantity(batch.quantity, product.unit);
  }

  getBatchRemaining(transaction: Transaction): string {
    const batch = this.getBatch(transaction);
    const product = this.getProduct(transaction);

    if (!batch || !product) {
      return '—';
    }

    return formatDisplayQuantity(batch.remainingQuantity, product.unit);
  }

  private async loadTransaction(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const [transactionResponse, products] = await Promise.all([
        firstValueFrom(this.transactionService.getById(this.transactionId())),
        this.productService.getAllItems(),
      ]);

      this.transaction.set(transactionResponse.data);
      this.products.set(new Map(products.map((product) => [product._id, product])));
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to load transaction.';
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
  }
}
