import { createAction, props } from '@ngrx/store';
import { IMenu, IMenuItem, ICategory } from '../model/menu.model';

// Fetch Menu
export const fetchMenu = createAction('[Menu] Fetch Menu', props<{ menuId: string }>());
export const fetchMenuSuccess = createAction('[Menu] Fetch Menu Success', props<{ menu: IMenu }>());
export const fetchMenuFailure = createAction('[Menu] Fetch Menu Failure', props<{ error: string }>());

// Add Category
export const addCategory = createAction('[Menu] Add Category', props<{ category: ICategory }>());
export const editCategory = createAction('[Menu] Edit Category', props<{ category: ICategory }>());

// Add Menu Item
export const addMenuItem = createAction('[Menu] Add Menu Item', props<{ categoryId: string | null, item: IMenuItem }>());
export const removeMenuItem = createAction('[Menu] Remove Menu Item', props<{ categoryId: string | null, item: IMenuItem }>());

// Save Menu (Post to API)
export const saveMenu = createAction('[Menu] Save Menu');
export const saveMenuSuccess = createAction('[Menu] Save Menu Success');
export const saveMenuFailure = createAction('[Menu] Save Menu Failure', props<{ error: string }>());

