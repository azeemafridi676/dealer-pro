export enum MenuType {
  Delivery = "Delivery",
  Pickup = "Pickup",
  EatIn = "EatIn",
}

export interface IMenu {
  _id: string;
  service_availability_ids?: string[];
  title: string;
  image_url: string;
  description: string;
  menuType: MenuType;
  useProductFrom: string;
  bannerImageUrl: string;
  logoImageUrl: string;
  storeId: string[];
  categories: ICategory[];
  status: string;
  restaurantId: string;

}

interface INutritionalInfo {
  kilojoules?: string | null;
  calories?: string | null;
}

interface ITaxInfo {
  tax_rate?: number | null;
  vat_rate_percentage?: number | null;
}

export interface IMenuItem {
  _id: string;
  categoryId: string;
  title: string;
  description: string;
  volume: number | null;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  nutritional_info: INutritionalInfo;
  external_data?: string | null;
  suspension_info?: string | null;
  image_url: string;
  price: number;
  tax_info: ITaxInfo;
  isAvailable: boolean;
  restaurantId: string;
}

export interface ICategory {
  _id?: string;
  title: string;
  subtitle?: string;
  image?: string;
  menuId: string;
  restaurantId: string;
  items: any[];
}