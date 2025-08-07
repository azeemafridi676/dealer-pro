import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class MenuService {
  private backendUrl = environment.BACKEND_URL;
  private GET_ALL_MENUS = `${this.backendUrl}/api/menu/get-all-menu`;
  private CREATE_MENUS = `${this.backendUrl}/api/menu/create-menu`;
  private GET_MENU_BY_ID = `${this.backendUrl}/api/menu/get-menu`;
  private DELETE_MENU = `${this.backendUrl}/api/menu/delete-menu`;
  private UPDATE_MENUS = `${this.backendUrl}/api/menu/update-menu`;

  constructor(private http: HttpClient) { }

  getMenus(): Observable<any> {
    return this.http.get<any>(`${this.GET_ALL_MENUS}`);
  }

  createMenu(menuData: any): Observable<any> {
    return this.http.post(this.CREATE_MENUS, menuData);
  }
  saveMenu(menuData:any): Observable<any> {
    return this.http.post<any>(this.UPDATE_MENUS,menuData);
  }

  getMenuById(menuId: string): Observable<any> {
    return this.http.get<any>(`${this.GET_MENU_BY_ID}/${menuId}`);
  }


  deleteMenu(menuId: string): Observable<any> {
    return this.http.delete(`${this.DELETE_MENU}/${menuId}`);
  }
}
