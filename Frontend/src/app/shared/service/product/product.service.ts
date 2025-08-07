import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { AuthService } from '../Auth/Auth.service';
import { CategoryModel } from '../../model/category.model';

@Injectable({
    providedIn: 'root'
})
export class ProductsService {

    private backendUrl = environment.BACKEND_URL;
    private CREATE_PRODUCT = `${this.backendUrl}/api/menuItems/create`;
    private UPDATE_PRODUCT = `${this.backendUrl}/api/menuItems/update`;
    private GET_ALL_PRODUCTS = `${this.backendUrl}/api/menuItems/get-all-by-restaurant`;
    private UPDATE_VENDORS = `${this.backendUrl}/api/vendors/update-vendor`;
    private DELETE_VENDORS = `${this.backendUrl}/api/vendors/delete-vendor/`;
    private DELETE_PRODUCT = `${this.backendUrl}/api/menuItems/delete-by`;
    private GET_ALL_CATEGORIES = `${this.backendUrl}/api/menuCategories/get-all`;
    private UPLOAD_PRODUCT_IMAGE = `${this.backendUrl}/api/menuCategories/product-image`;
    private CREATE_MODIFIER_GROUP = `${this.backendUrl}/api/menuModifierGroup/create`;
    private GET_PRODUCT_BY_ID = `${this.backendUrl}/api/menuItems/get-by`;
    private GET_ALL_BY_RESTAURANT = `${this.backendUrl}/api/menuItems/get-all-by-restaurant`;
    private ADD_PRODUCT_TO_CATEGORY = `${this.backendUrl}/api/menuItems/add-to-category`;
    constructor(
        private http: HttpClient,
    ) { }

    getProducts(page: number = 1, pageSize: number = 10): Observable<any> {
        return this.http.get(`${this.GET_ALL_PRODUCTS}?page=${page}&pageSize=${pageSize}`);
    }
    createProduct(formData : FormData): Observable<any> {
        return this.http.post<any>(`${this.CREATE_PRODUCT}` , formData)
    }
    updateProductByID(productId: string, productData: any): Observable<any> {
    return this.http.put<any>(`${this.UPDATE_PRODUCT}/${productId}`, productData);
    }

    updateProduct(id: any, data: any): Observable<any> {
        return this.http.post<any>(`${this.UPDATE_PRODUCT}/${id}`, data)
    }
    deleteProduct(id: any): Observable<any> {
        return this.http.delete<any>(`${this.DELETE_PRODUCT}/${id}`)
    }
    getCategories() {
        return this.http.get<{ message : string , status : number , data : CategoryModel[]}>(`${this.GET_ALL_CATEGORIES}`).pipe(map(res => res.data))
    }
    uploadProductImage(form : FormData){
        return this.http.post<{ message : string , status : number , data : { url : string }}>(`${this.UPLOAD_PRODUCT_IMAGE}` , form).pipe(map(res => res.data))
    }
    createModifierGroup(formData : any): Observable<any> {
        return this.http.post<any>(`${this.CREATE_MODIFIER_GROUP}` , formData)
    }
    getProductById(id:any): Observable<any> {
        return this.http.get<any>(`${this.GET_PRODUCT_BY_ID}/${id}`)
    }
    getAllByRestaurant(): Observable<any> {
        return this.http.get<any>(`${this.GET_ALL_BY_RESTAURANT}`)
    }
    addProductToCategory(productData: any): Observable<any> {
        return this.http.post<any>(this.ADD_PRODUCT_TO_CATEGORY, productData);
      }
}
