import {
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import * as QRCode from 'qrcode';

export interface QrPreviewData {
  batchNumber: string;
  productName: string;
  expiryDate?: string;
}

@Component({
  selector: 'app-inventory-qr-preview',
  templateUrl: './inventory-qr-preview.component.html',
  styleUrl: './inventory-qr-preview.component.scss',
  imports: [DatePipe, TitleCasePipe],
})
export class InventoryQrPreviewComponent {
  preview = input.required<QrPreviewData>();
  closed = output<void>();

  qrImageUrl = signal<string | null>(null);
  loading = signal(true);
  error = signal('');

  constructor() {
    effect(() => {
      const data = this.preview();
      void this.renderQr(data.batchNumber);
    });
  }

  close(): void {
    this.closed.emit();
  }

  print(): void {
    const data = this.preview();
    const imageUrl = this.qrImageUrl();

    if (!imageUrl) {
      return;
    }

    this.error.set('');

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

    const expiryLine = data.expiryDate
      ? `<p>Expiry: ${new Date(data.expiryDate).toLocaleDateString()}</p>`
      : '';

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR - ${data.batchNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 24px;
            }

            img {
              width: 280px;
              height: 280px;
            }

            .code {
              font-family: monospace;
              margin-top: 16px;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <h2>${data.productName}</h2>
          <p>Batch: ${data.batchNumber}</p>
          ${expiryLine}
          <img src="${imageUrl}" alt="QR Code" />
        </body>
      </html>
    `);
    printWindow.document.close();

    const cleanup = () => iframe.remove();

    printWindow.onafterprint = cleanup;
    printWindow.focus();
    printWindow.print();

    // Fallback cleanup if onafterprint is not supported.
    setTimeout(cleanup, 2000);
  }

  private async renderQr(value: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const dataUrl = await QRCode.toDataURL(value, {
        width: 280,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
      this.qrImageUrl.set(dataUrl);
    } catch {
      this.error.set('Failed to render QR code.');
      this.qrImageUrl.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
