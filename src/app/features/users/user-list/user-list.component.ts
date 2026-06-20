import { Component, inject, signal } from '@angular/core';
import { NgClass, TitleCasePipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { PaginationComponent } from 'src/app/theme/shared/components/pagination/pagination.component';
import { ListToolbarComponent } from 'src/app/theme/shared/components/list-toolbar/list-toolbar.component';
import { SortableHeaderComponent } from 'src/app/theme/shared/components/sortable-header/sortable-header.component';
import { DEFAULT_PAGE_LIMIT } from 'src/app/theme/shared/constants/pagination.constants';
import { SortOrder } from 'src/app/theme/shared/models/sort-order.enum';
import { createDebouncedSearch } from 'src/app/theme/shared/utils/debounced-search.util';
import { nextTableSort } from 'src/app/theme/shared/utils/table-sort.util';
import { Role } from 'src/app/theme/shared/enums/role.enum';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  imports: [NgClass, TitleCasePipe, PaginationComponent, SortableHeaderComponent, ListToolbarComponent],
})
export class UserListComponent {
  private userService = inject(UserService);

  readonly debouncedSearch = createDebouncedSearch();

  page = signal(1);
  limit = signal(DEFAULT_PAGE_LIMIT);
  sortBy = signal<string | undefined>(undefined);
  sortOrder = signal<SortOrder | undefined>(undefined);

  userResource = rxResource({
    params: () => ({
      page: this.page(),
      limit: this.limit(),
      search: this.debouncedSearch.debouncedSearch(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
    }),
    stream: ({ params }) =>
      this.userService.get(params).pipe(map((response) => response.data)),
  });

  onPageChange(page: number): void {
    this.page.set(page);
  }

  onSearchChange(value: string): void {
    this.debouncedSearch.searchInput.set(value);
    this.page.set(1);
  }

  onLimitChange(value: number): void {
    this.limit.set(value);
    this.page.set(1);
  }

  onSort(column: string): void {
    const next = nextTableSort(
      { sortBy: this.sortBy(), sortOrder: this.sortOrder() },
      column,
    );
    this.sortBy.set(next.sortBy);
    this.sortOrder.set(next.sortOrder);
    this.page.set(1);
  }

  getRole(role: number) {
    return Object.entries(Role).find((x) => x[1] === role)![0];
  }
}
