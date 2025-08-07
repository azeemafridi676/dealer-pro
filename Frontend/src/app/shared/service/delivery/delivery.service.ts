import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class DeliveryService {
    private backendUrl = environment.BACKEND_URL;
    private GET_DELIVERY_BY_ID = `${this.backendUrl}/api/delivery`;
    private UPDATE_DELIVERY_STATUS = `${this.backendUrl}/api/delivery/status`;
    
    constructor(private http: HttpClient) { }

    getDeliveryById(deliveryId: string): Observable<any> {
        return this.http.get<any>(`${this.GET_DELIVERY_BY_ID}/${deliveryId}`);
    }

    updateDeliveryStatus(deliveryId: string, status: string): Observable<any> {
        return this.http.patch<any>(`${this.UPDATE_DELIVERY_STATUS}/${deliveryId}`, { status });
    }
}
