import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconDirective, IconService } from '@ant-design/icons-angular';
import {
  DeleteOutline,
  EditOutline,
  EyeOutline,
  NodeIndexOutline,
  PlayCircleOutline,
  QrcodeOutline,
} from '@ant-design/icons-angular/icons';

export type TableActionVariant = 'primary' | 'secondary' | 'danger';

export type TableActionIcon =
  | 'edit'
  | 'delete'
  | 'eye'
  | 'qrcode'
  | 'play-circle'
  | 'node-index';

@Component({
  selector: 'app-table-icon-action',
  imports: [IconDirective, RouterLink],
  templateUrl: './table-icon-action.component.html',
})
export class TableIconActionComponent {
  private static iconsReady = false;

  icon = input.required<TableActionIcon>();
  title = input.required<string>();
  variant = input<TableActionVariant>('secondary');
  disabled = input(false);
  routerLink = input<string[] | null>(null);
  actionClick = output<MouseEvent>();

  constructor() {
    if (!TableIconActionComponent.iconsReady) {
      inject(IconService).addIcon(
        EditOutline,
        DeleteOutline,
        EyeOutline,
        QrcodeOutline,
        PlayCircleOutline,
        NodeIndexOutline,
      );
      TableIconActionComponent.iconsReady = true;
    }
  }

  variantClass(): string {
    return `table-action-btn table-action-btn--${this.variant()}`;
  }
}
