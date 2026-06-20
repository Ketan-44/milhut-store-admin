import { Component, input, output } from '@angular/core';
import { SortOrder } from '../../models/sort-order.enum';
import {
  isSortActive,
  isSortAsc,
  isSortDesc,
} from '../../utils/table-sort.util';

@Component({
  selector: 'app-sortable-header',
  template: `
    <button
      type="button"
      class="btn btn-link sortable-header p-0 border-0 text-decoration-none d-inline-flex align-items-center gap-1"
      [class.text-body]="!isActive"
      [class.fw-semibold]="isActive"
      (click)="sortClick.emit(column())"
    >
      <span>{{ label() }}</span>
      <span class="sortable-header-arrows" [class.is-active]="isActive">
        <svg
          class="sort-arrow"
          [class.active]="isAsc"
          viewBox="0 0 12 12"
          width="12"
          height="12"
          aria-hidden="true"
        >
          <path d="M6 3L10 8H2L6 3Z" fill="currentColor" />
        </svg>
        <svg
          class="sort-arrow"
          [class.active]="isDesc"
          viewBox="0 0 12 12"
          width="12"
          height="12"
          aria-hidden="true"
        >
          <path d="M6 9L2 4H10L6 9Z" fill="currentColor" />
        </svg>
      </span>
    </button>
  `,
  styles: `
    .sortable-header {
      font-size: inherit;
      line-height: inherit;
      vertical-align: baseline;
      color: inherit;
    }

    .sortable-header-arrows {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      color: var(--bs-secondary-color, #6c757d);
      flex-shrink: 0;
    }

    .sortable-header-arrows.is-active {
      color: var(--bs-primary, #0d6efd);
    }

    .sort-arrow {
      display: block;
      opacity: 0.55;
    }

    .sortable-header-arrows.is-active .sort-arrow.active {
      opacity: 1;
    }

    .sortable-header-arrows.is-active .sort-arrow:not(.active) {
      opacity: 0.35;
    }
  `,
})
export class SortableHeaderComponent {
  label = input.required<string>();
  column = input.required<string>();
  sortBy = input<string | undefined>();
  sortOrder = input<SortOrder | undefined>();

  sortClick = output<string>();

  get state() {
    return { sortBy: this.sortBy(), sortOrder: this.sortOrder() };
  }

  get isActive(): boolean {
    return isSortActive(this.state, this.column());
  }

  get isAsc(): boolean {
    return isSortAsc(this.state, this.column());
  }

  get isDesc(): boolean {
    return isSortDesc(this.state, this.column());
  }
}
