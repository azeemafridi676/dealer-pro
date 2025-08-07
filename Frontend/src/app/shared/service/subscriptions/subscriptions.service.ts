import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

@Injectable({
    providedIn: 'root'
})
export class SubscriptionsService {
    private backendUrl = environment.BACKEND_URL;
    private GET_ALL_SUBSCRIPTIONS = `${this.backendUrl}/api/subscriptions/get-all-plans`;
    private GET_ALL_INVOICES = `${this.backendUrl}/api/subscriptions/get-invoices`;
    private CREATE_SUBSCRIPTIONS = `${this.backendUrl}/api/subscriptions/create-plans`;
    private UPDATE_SUBSCRIPTIONS = `${this.backendUrl}/api/subscriptions/update-plans`;
    private DELETE_SUBSCRIPTIONS = `${this.backendUrl}/api/subscriptions/delete-plan/`;
    private CHECKOUT_SESSION = `${this.backendUrl}/api/subscriptions/create-checkout-session`;
    private SESSION_DETAIL = `${this.backendUrl}/api/subscriptions/session-detail/`;
    private GIFT_SUBSCRIPTION = `${this.backendUrl}/api/subscriptions/gift-subscription`;
    
    constructor(
        private http: HttpClient,
        private toastr: ToastrService,
    ) { }

    getSubscriptions(): Observable<any> {
        return this.http.get<any>(`${this.GET_ALL_SUBSCRIPTIONS}`)
    }
    getInvoices(): Observable<any> {
        return this.http.get<any>(`${this.GET_ALL_INVOICES}`)
    }
    createSubscription(data:any): Observable<any> {
        return this.http.post<any>(this.CREATE_SUBSCRIPTIONS,data)
    }
    createCheckoutSession(data:any): Observable<any> {
        return this.http.post<any>(this.CHECKOUT_SESSION,data)
    }
    getCheckoutSession(sessionId:any): Observable<any> {
        return this.http.get<any>(this.SESSION_DETAIL+sessionId)
    }
    updateSubscription(data:any): Observable<any> {
        return this.http.post<any>(this.UPDATE_SUBSCRIPTIONS,data)
    }
    deleteSubscription(id:any): Observable<any> {
        return this.http.delete<any>(this.DELETE_SUBSCRIPTIONS+id)
    }
    getSubscriptionStatus(): Observable<any> {
        return this.http.get<any>(`${this.backendUrl}/api/subscriptions/status`).pipe(
            tap(response => {
                if (response.data.subscriptionStatus === 'payment_failed') {
                    this.toastr.error('Your last payment failed. Please update your payment method.');
                }
            })
        );
    }
    retryFailedPayment(paymentMethodId: string): Observable<any> {
        return this.http.post<any>(`${this.backendUrl}/api/subscriptions/retry-payment`, {
            paymentMethodId
        });
    }
    toggleVisibility(id: string) {
        return this.http.patch(`${this.backendUrl}/api/subscriptions/${id}/visibility`, {});
    }
    giftSubscription(userId: string, subscriptionId: string): Observable<any> {
        return this.http.post<any>(this.GIFT_SUBSCRIPTION, {
            userId,
            subscriptionId
        });
    }
}
