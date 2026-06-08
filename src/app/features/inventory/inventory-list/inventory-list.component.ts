import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { resource } from '@angular/core';
import { Product } from '../../products/models/product.model';
import { ProductService } from '../../products/services/product.service';
import { Inventory } from '../models/inventory.model';
import {
  InventoryQrPreviewComponent,
  QrPreviewData,
} from '../inventory-qr-preview/inventory-qr-preview.component';
import { InventoryService } from '../services/inventory.service';
import { formatDisplayQuantity } from '../utils/quantity.util';

@Component({
  selector: 'app-inventory-list',
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.scss'],
  imports: [RouterModule, DatePipe, InventoryQrPreviewComponent],
})
export class InventoryListComponent {
  private inventoryService = inject(InventoryService);
  private productService = inject(ProductService);

  generatingQrFor: string | null = null;
  qrError = '';
  qrPreview: QrPreviewData | null = null;

  inventoryResource = resource({
    loader: async () => {
      const [inventoryResponse, productResponse] = await Promise.all([
        firstValueFrom(this.inventoryService.get()),
        firstValueFrom(this.productService.get()),
      ]);

      const products = new Map(
        productResponse.data.map((product) => [product._id, product]),
      );

      return {
        batches: inventoryResponse.data,
        products,
      };
    },
  });

  getProductName(productId: string, products: Map<string, Product>): string {
    return products.get(productId)?.name ?? productId;
  }

  getDisplayQuantity(
    quantity: number,
    productId: string,
    products: Map<string, Product>,
  ): string {
    const product = products.get(productId);
    if (!product) {
      return String(quantity);
    }

    return formatDisplayQuantity(quantity, product.unit);
  }

  isExpired(expiryDate: string): boolean {
    return new Date(expiryDate).getTime() < Date.now();
  }

  generateQr(batch: Inventory): void {
    this.generatingQrFor = batch._id;
    this.qrError = '';

    this.inventoryService.generateQr(batch._id).subscribe({
      next: (response) => {
        this.generatingQrFor = null;
        this.inventoryResource.reload();
        this.openQrPreview(batch, response.data.qrCode);
      },
      error: (error) => {
        this.generatingQrFor = null;
        this.qrError = error.message ?? 'Failed to generate QR code.';
      },
    });
  }

  viewQr(batch: Inventory): void {
    if (!batch.qrCode) {
      return;
    }

    this.openQrPreview(batch, batch.qrCode);
  }

  closeQrPreview(): void {
    this.qrPreview = null;
  }

  private openQrPreview(batch: Inventory, qrCode: string): void {
    const products = this.inventoryResource.value()?.products;

    this.qrPreview = {
      batchNumber: batch.batchNumber,
      productName: products
        ? this.getProductName(batch.productId, products)
        : batch.productId,
      qrCode,
      expiryDate: batch.expiryDate,
    };
  }
}
