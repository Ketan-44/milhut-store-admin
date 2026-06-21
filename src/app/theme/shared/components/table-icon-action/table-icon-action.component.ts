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
  SnippetsOutline,
} from '@ant-design/icons-angular/icons';

export type TableActionVariant = 'primary' | 'secondary' | 'danger';

export type TableActionIcon =
  | 'edit'
  | 'delete'
  | 'eye'
  | 'qrcode'
  | 'play-circle'
  | 'node-index'
  | 'copy';

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
        SnippetsOutline,
      );
      TableIconActionComponent.iconsReady = true;
    }
  }

  variantClass(): string {
    return `table-action-btn table-action-btn--${this.variant()}`;
  }

  iconType(): string {
    if (this.icon() === 'copy') {
      return 'snippets';
    }

    return this.icon();
  }
}
