import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class StoreService {
    private backendUrl = environment.BACKEND_URL;
    private DELETE_STORE = `${this.backendUrl}/api/store/delete-by-id`;
    private GET_STORE_BY_ID = `${this.backendUrl}/api/store/get-by-id`;
    private UPDATE_STORE = `${this.backendUrl}/api/store/update`;

    constructor(
        private http: HttpClient,
    ) { }

    deleteStore(storeId: any): Observable<any> {
        return this.http.delete(`${this.DELETE_STORE}/${storeId}`);
    }

    getStoreById(storeId: any): Observable<any> {
        return this.http.get(`${this.GET_STORE_BY_ID}/${storeId}`);
    }

    updateStore(storeId: any, storeData: any): Observable<any> {
        return this.http.put(`${this.UPDATE_STORE}/${storeId}`, storeData);
    }
}
