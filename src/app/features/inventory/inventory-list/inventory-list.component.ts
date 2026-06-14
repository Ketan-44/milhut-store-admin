import { Component, inject } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
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
  imports: [RouterModule, DatePipe, TitleCasePipe, InventoryQrPreviewComponent],
})
export class InventoryListComponent {
  private inventoryService = inject(InventoryService);
  private productService = inject(ProductService);

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

  viewQr(batch: Inventory): void {
    const products = this.inventoryResource.value()?.products;

    this.qrPreview = {
      batchNumber: batch.batchNumber,
      productName: products
        ? this.getProductName(batch.productId, products)
        : batch.productId,
      expiryDate: batch.expiryDate,
    };
  }

  closeQrPreview(): void {
    this.qrPreview = null;
  }
}
