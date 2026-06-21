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

  print(): void {
    const item = this.transaction();

    if (!item) {
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const printWindow = iframe.contentWindow;

    if (!printWindow) {
      iframe.remove();
      this.error.set('Unable to prepare print view.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(this.buildPrintHtml(item));
    printWindow.document.close();

    const cleanup = () => iframe.remove();

    printWindow.onafterprint = cleanup;
    printWindow.focus();
    printWindow.print();

    setTimeout(cleanup, 2000);
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

  private buildPrintHtml(item: Transaction): string {
    const rows: string[] = [];

    if (item.createdAt) {
      rows.push(this.buildPrintRow('Date', this.formatDateTime(item.createdAt)));
    }

    rows.push(this.buildPrintRow('Type', this.toTitleCase(item.type)));
    rows.push(
      this.buildPrintRow(
        'Product',
        this.toTitleCase(this.getProduct(item)?.name ?? '—'),
      ),
    );
    rows.push(this.buildPrintRow('Quantity', this.getTransactionQuantity(item)));
    rows.push(
      this.buildPrintRow('Performed By', this.escapeHtml(this.getUser(item)?.name ?? '—')),
    );
    rows.push(this.buildPrintRow('Remarks', this.escapeHtml(item.remarks ?? '—')));

    const batch = this.getBatch(item);

    if (batch) {
      rows.push(
        this.buildPrintRow(
          'Batch',
          `${this.escapeHtml(batch.batchNumber)} (${this.toTitleCase(batch.batchType)})`,
        ),
      );

      if (batch.expiryDate) {
        rows.push(this.buildPrintRow('Expiry', this.formatDate(batch.expiryDate)));
      }

      if (batch.quantity !== undefined) {
        rows.push(
          this.buildPrintRow(
            'Batch Qty',
            `${this.getBatchQuantity(item)} (remaining: ${this.getBatchRemaining(item)})`,
          ),
        );
      }

      if (batch.producedFrom?.length) {
        const producedFromHtml = batch.producedFrom
          .map((consumption) => {
            const batchesHtml = consumption.batches
              .map(
                (sourceBatch) =>
                  `<li>${this.escapeHtml(sourceBatch.batchNumber)} — ${this.getIngredientQuantity(consumption.productId, sourceBatch.quantity)}</li>`,
              )
              .join('');

            return `<li><strong>${this.toTitleCase(consumption.productName)}</strong><ul>${batchesHtml}</ul></li>`;
          })
          .join('');

        rows.push(
          `<tr><td class="label">Produced From</td><td><ul class="nested-list">${producedFromHtml}</ul></td></tr>`,
        );
      }
    }

    return `<!DOCTYPE html>
<html>
  <head>
    <title>Transaction - ${this.escapeHtml(item._id)}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        padding: 24px;
        color: #212529;
      }

      h1 {
        font-size: 1.25rem;
        margin: 0 0 1rem;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      td {
        padding: 0.4rem 0;
        vertical-align: top;
      }

      .label {
        width: 140px;
        color: #6c757d;
        font-size: 0.875rem;
      }

      ul {
        margin: 0;
        padding-left: 1.25rem;
      }

      .nested-list ul {
        margin-top: 0.25rem;
      }
    </style>
  </head>
  <body>
    <h1>Transaction Details</h1>
    <table>${rows.join('')}</table>
  </body>
</html>`;
  }

  private buildPrintRow(label: string, value: string): string {
    return `<tr><td class="label">${this.escapeHtml(label)}</td><td>${value}</td></tr>`;
  }

  private formatDateTime(value: string): string {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  private formatDate(value: string): string {
    return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' });
  }

  private toTitleCase(value: string): string {
    return this.escapeHtml(
      value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()),
    );
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
