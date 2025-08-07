import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class CategoryService {
  private backendUrl = environment.BACKEND_URL;
  private CREATE_CATEGORY = `${this.backendUrl}/api/menuCategories/create`;
  private GET_CATEGORY = `${this.backendUrl}/api/menuCategories/get-by/:id`;
  private GET_ALL_CATEGORY = `${this.backendUrl}/api/menuCategories/get-all`;
  private UPDATE_CATEGORY = `${this.backendUrl}/api/menuCategories/update/:id`;
  private DELETE_CATEGORY = `${this.backendUrl}/api/menuCategories/delete/by-id/:id`;

  constructor(private http: HttpClient) {}

  createCategory(categoryData: any): Observable<any> {
    return this.http.post(this.CREATE_CATEGORY, categoryData);
  }

  getCategory(id: string): Observable<any> {
    return this.http.get(this.GET_CATEGORY.replace(':id', id));
  }
  getallCategory(): Observable<any> {
    return this.http.get(this.GET_ALL_CATEGORY);
  }

  updateCategory(id: string, categoryData: any): Observable<any> {
    return this.http.put(this.UPDATE_CATEGORY.replace(':id', id), categoryData);
  }

  deleteCategory(id: string): Observable<any> {
    return this.http.delete(this.DELETE_CATEGORY.replace(':id', id));
  }
}