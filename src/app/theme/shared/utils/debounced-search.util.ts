import { signal, WritableSignal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { SEARCH_DEBOUNCE_MS } from '../constants/pagination.constants';

export interface DebouncedSearch {
  searchInput: WritableSignal<string>;
  debouncedSearch: () => string;
}

export function createDebouncedSearch(
  initialValue = '',
  debounceMs = SEARCH_DEBOUNCE_MS,
): DebouncedSearch {
  const searchInput = signal(initialValue);
  const debouncedSearch = toSignal(
    toObservable(searchInput).pipe(
      debounceTime(debounceMs),
      distinctUntilChanged(),
    ),
    { initialValue },
  );

  return {
    searchInput,
    debouncedSearch,
  };
}
