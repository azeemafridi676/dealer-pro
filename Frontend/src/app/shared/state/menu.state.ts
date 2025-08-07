import { IMenu, IMenuItem, ICategory } from '../model/menu.model';

export interface MenuState {
  menu: IMenu | null; // The whole menu object
  loading: boolean;
  saveStatus: boolean;
  error: string | null;
}

export const initialMenuState: MenuState = {
  menu: null,
  loading: false,
  saveStatus: false,
  error: null,
};