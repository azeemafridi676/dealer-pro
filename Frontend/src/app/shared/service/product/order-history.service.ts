import { Injectable, PipeTransform } from '@angular/core';

import { BehaviorSubject, Observable, of, Subject } from 'rxjs';

import { orderHistory } from '../../data/interface/order';
import { ORDERHISTORY } from '../../data/e-commerce/order-history';
import { DecimalPipe } from '@angular/common';
import { debounceTime, delay, switchMap, tap } from 'rxjs/operators';
import {
  SortColumn,
  SortDirection,
} from '../../directive/order-history.directive';

interface SearchResult {
  orders: orderHistory[];
  total: number;
}

interface State {
  page: number;
  pageSize: number;
  searchTerm: string;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
}

const compare = (v1: string | number, v2: string | number) =>
  v1 < v2 ? -1 : v1 > v2 ? 1 : 0;

function sort(
  orders: orderHistory[],
  column: SortColumn,
  direction: string
): orderHistory[] {
  if (direction === '' || column === '') {
    return orders;
  } else {
    return [...orders].sort((a, b) => {
      const res = compare(a[column], b[column]);
      return direction === 'asc' ? res : -res;
    });
  }
}

function matches(order: orderHistory, term: string, pipe: PipeTransform) {
  return (
    order.product.toLowerCase().includes(term.toLowerCase()) ||
    pipe.transform(order.id).includes(term) ||
    pipe.transform(order.articleNumber).includes(term) ||
    pipe.transform(order.units).includes(term) ||
    pipe.transform(order.price).includes(term)
  );
}
@Injectable({
  providedIn: 'root',
})
export class OrderHistoryService {
  private _loading$ = new BehaviorSubject<boolean>(true);
  private _search$ = new Subject<void>();
  private _orders$ = new BehaviorSubject<orderHistory[]>([]);
  private _total$ = new BehaviorSubject<number>(0);

  private _state: State = {
    page: 1,
    pageSize: 5,
    searchTerm: '',
    sortColumn: '',
    sortDirection: '',
  };

  constructor(private pipe: DecimalPipe) {
    this._search$
      .pipe(
        tap(() => this._loading$.next(true)),
        debounceTime(200),
        switchMap(() => this._search()),
        delay(200),
        tap(() => this._loading$.next(false))
      )
      .subscribe((result) => {
        this._orders$.next(result.orders);
        this._total$.next(result.total);
      });

    this._search$.next();
  }

  get orders$() {
    return this._orders$.asObservable();
  }
  get total$() {
    return this._total$.asObservable();
  }
  get loading$() {
    return this._loading$.asObservable();
  }
  get page() {
    return this._state.page;
  }
  get pageSize() {
    return this._state.pageSize;
  }
  get searchTerm() {
    return this._state.searchTerm;
  }

  set page(page: number) {
    this._set({ page });
  }
  set pageSize(pageSize: number) {
    this._set({ pageSize });
  }
  set searchTerm(searchTerm: string) {
    this._set({ searchTerm });
  }
  set sortColumn(sortColumn: SortColumn) {
    this._set({ sortColumn });
  }
  set sortDirection(sortDirection: SortDirection) {
    this._set({ sortDirection });
  }

  private _set(patch: Partial<State>) {
    Object.assign(this._state, patch);
    this._search$.next();
  }

  private _search(): Observable<SearchResult> {
    const { sortColumn, sortDirection, pageSize, page, searchTerm } =
      this._state;

    // 1. sort
    let orders = sort(ORDERHISTORY, sortColumn, sortDirection);

    // 2. filter
    orders = orders.filter((order) => matches(order, searchTerm, this.pipe));
    const total = orders.length;

    // 3. paginate
    orders = orders.slice(
      (page - 1) * pageSize,
      (page - 1) * pageSize + pageSize
    );
    return of({ orders, total });
  }
}
