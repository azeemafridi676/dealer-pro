import * as MenuActions from '../actions/menu.action';
import { MenuService } from '../../shared/service/menu/menus.service';
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';
import { Store } from '@ngrx/store';
import { selectMenu } from '../selectors/menu.selectors';

@Injectable()
export class MenuEffects {
  constructor(
    private actions$: Actions,
    private menuService: MenuService,
    private store: Store<any>, 

  ) { }
  fetchMenu$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MenuActions.fetchMenu),
      switchMap(action =>
        this.menuService.getMenuById(action.menuId).pipe(
          map(menu => MenuActions.fetchMenuSuccess({ menu:menu.data })),
          catchError(error => of(MenuActions.fetchMenuFailure({ error })))
        )
      )
    )
  );

  saveMenu$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MenuActions.saveMenu),
      withLatestFrom(this.store.select(selectMenu)),
      switchMap(([action, menu]) =>
        this.menuService.saveMenu(menu).pipe(
          map(() => MenuActions.saveMenuSuccess()),
          catchError(error => of(MenuActions.saveMenuFailure({ error })))
        )
      )
    )
  );
  
}