import { createReducer, on } from '@ngrx/store';
import * as MenuActions from '../actions/menu.action';
import { IMenu, IMenuItem, ICategory } from '../model/menu.model';
import { MenuState, initialMenuState } from '../state/menu.state';

export const menuReducer = createReducer(
initialMenuState,

  // Fetch Menu
  on(MenuActions.fetchMenu, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(MenuActions.fetchMenuSuccess, (state, { menu }) => ({
    ...state,
    menu,
    loading: false,
  })),
  on(MenuActions.fetchMenuFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Add Category
  on(MenuActions.addCategory, (state, { category }) => {
    const updatedMenu = state.menu
      ? {
          ...state.menu,
          categories: [...state.menu.categories, category], // Append the new category
        }
      : state.menu;

    return { ...state, menu: updatedMenu };
  }),
  on(MenuActions.editCategory, (state, { category }) => {
    const updatedMenu = state.menu
      ? {
          ...state.menu,
          categories: state.menu.categories.map((cat) =>
            cat._id === category._id ? { ...cat, ...category } : cat
          ),
        }
      : state.menu;
  
    return { ...state, menu: updatedMenu };
  }),
  

  // Add Menu Item
  on(MenuActions.addMenuItem, (state, { categoryId, item }) => {
    if (!state.menu) {
      return state; 
    }

    const updatedCategories = state.menu.categories.map((category) =>{
      if(category._id === categoryId){
        return { 
          ...category, 
          items: [
            ...category.items.filter(existingItem => existingItem._id !== item._id), 
            item
          ] 
        };
      }else{
        return category
      }
    }
    );

    const updatedMenu = {
      ...state.menu,
      categories: updatedCategories,
    };

    return { ...state, menu: updatedMenu };
  }),
  // Remove Menu Item
  on(MenuActions.removeMenuItem, (state, { categoryId, item }) => {
    if (!state.menu) {
      return state; 
    }

    const updatedCategories = state.menu.categories.map((category) =>{
      if(category._id === categoryId){
        return { 
          ...category, 
          items: category.items.filter(existingItem => existingItem._id !== item._id)
        };
      }else{
        return category
      }
    }
    );

    const updatedMenu = {
      ...state.menu,
      categories: updatedCategories,
    };

    return { ...state, menu: updatedMenu };
  }),

  // Save Menu
  on(MenuActions.saveMenu, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(MenuActions.saveMenuSuccess, (state) => ({
    ...state,
    loading: false,
  })),
  on(MenuActions.saveMenuFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }))
);
