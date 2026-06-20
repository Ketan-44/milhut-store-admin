import { Component, computed, input, output } from '@angular/core';
import { PaginationMeta } from '../../models/pagination.model';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
  meta = input.required<PaginationMeta>();
  pageChange = output<number>();

  startItem = computed(() => {
    const meta = this.meta();
    if (meta.total === 0) {
      return 0;
    }

    return (meta.page - 1) * meta.limit + 1;
  });

  endItem = computed(() => {
    const meta = this.meta();
    return Math.min(meta.page * meta.limit, meta.total);
  });

  changePage(page: number): void {
    const meta = this.meta();

    if (page < 1 || page > meta.totalPages || page === meta.page) {
      return;
    }

    this.pageChange.emit(page);
  }
}
