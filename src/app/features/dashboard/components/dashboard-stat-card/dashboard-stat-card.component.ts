import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { IconDirective, IconService } from '@ant-design/icons-angular';
import {
  FallOutline,
  MinusOutline,
  RiseOutline,
} from '@ant-design/icons-angular/icons';

export type DashboardStatTrend = 'up' | 'down' | 'neutral';

@Component({
  selector: 'app-dashboard-stat-card',
  imports: [DecimalPipe, IconDirective],
  templateUrl: './dashboard-stat-card.component.html',
  styleUrl: './dashboard-stat-card.component.scss',
})
export class DashboardStatCardComponent {
  title = input.required<string>();
  value = input.required<number>();
  trend = input<DashboardStatTrend>('neutral');
  changePercent = input(0);
  footerHighlight = input<number | string>(0);
  footerText = input('');
  footerVariant = input<'default' | 'inventory'>('default');
  loading = input(false);

  constructor() {
    inject(IconService).addIcon(RiseOutline, FallOutline, MinusOutline);
  }

  trendLabel = computed(() => {
    if (this.footerVariant() === 'inventory') {
      const lowStock = Number(this.footerHighlight());

      if (lowStock > 0) {
        return `${lowStock} low`;
      }

      return 'OK';
    }

    const percent = this.changePercent();

    if (this.trend() === 'neutral' || percent === 0) {
      return '0%';
    }

    return `${percent}%`;
  });
}
