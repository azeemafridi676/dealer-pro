import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MenuState } from '../state/menu.state';

export const selectRootState = createFeatureSelector<MenuState>('state');


// Selector for the menu object
export const selectMenu = createSelector(
  selectRootState,
  (state: MenuState) => state.menu
);

// Selector for the loading status
export const selectMenuLoading = createSelector(
  selectRootState,
  (state: MenuState) => state.loading
);

// Selector for error
export const selectMenuError = createSelector(
  selectRootState,
  (state: MenuState) => state.error
);