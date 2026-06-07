import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { resource } from '@angular/core';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
  imports: [NgClass, RouterModule],
})
export class ProductListComponent {
  private productService = inject(ProductService);

  productResource = resource({
    loader: async () => {
      const response = await firstValueFrom(this.productService.get());
      return response.data;
    },
  });
}
