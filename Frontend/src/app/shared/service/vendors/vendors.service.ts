import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../Auth/Auth.service';

@Injectable({
    providedIn: 'root'
})
export class VendorsService {
    private backendUrl = environment.BACKEND_URL;
    private GET_ALL_VENDORS = `${this.backendUrl}/api/vendors/get-all-vendors`;
    private UPDATE_VENDORS = `${this.backendUrl}/api/vendors/update-vendor`;
    private DELETE_VENDORS = `${this.backendUrl}/api/vendors/delete-vendor/`;
    constructor(
        private http: HttpClient,        
    ) { }

    getVendors(): Observable<any> {
        return this.http.get<any>(`${this.GET_ALL_VENDORS}`)
    }
    updateVendor(data:any): Observable<any> {
        return this.http.post<any>(this.UPDATE_VENDORS,data)
    }
    deleteVendor(id:any): Observable<any> {
        return this.http.delete<any>(this.DELETE_VENDORS+id)
    }

 
}
