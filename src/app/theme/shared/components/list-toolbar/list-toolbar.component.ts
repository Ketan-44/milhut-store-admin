import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconDirective, IconService } from '@ant-design/icons-angular';
import { SearchOutline } from '@ant-design/icons-angular/icons';
import {
  DEFAULT_PAGE_LIMIT,
  PAGE_LIMIT_OPTIONS,
} from '../../constants/pagination.constants';

@Component({
  selector: 'app-list-toolbar',
  imports: [FormsModule, IconDirective],
  templateUrl: './list-toolbar.component.html',
  styleUrl: './list-toolbar.component.scss',
})
export class ListToolbarComponent {
  readonly limitSelectId = `list-limit-${Math.random().toString(36).slice(2, 9)}`;

  search = input('');
  limit = input(DEFAULT_PAGE_LIMIT);
  searchPlaceholder = input('Search...');
  limitOptions = input<number[]>([...PAGE_LIMIT_OPTIONS]);

  searchChange = output<string>();
  limitChange = output<number>();

  constructor() {
    inject(IconService).addIcon(SearchOutline);
  }

  onSearchChange(value: string): void {
    this.searchChange.emit(value);
  }

  onLimitChange(value: string): void {
    const parsed = Number(value);

    if (!Number.isNaN(parsed)) {
      this.limitChange.emit(parsed);
    }
  }
}
