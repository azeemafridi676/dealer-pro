import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SwishPaymentStatus } from 'src/app/components/swish/swish.component';

export interface CustomerSearchResponse {
  success: boolean;
  message?: string;
  data?: {
    name: string;
    telephone: string;
    email: string;
    address: string;
    type: string;
    status: string;
    customer_id: string;
    socialSecurityNumber?: string;
    postalCodeCity?: string;
  };
}

export interface SwishPaymentRequest {
  reference: string;
  name: string;
  category: string;
  amounts: { amount: number; description: string }[];
  socialSecurityNumber: string;
  telephoneNumber: string;
  email: string;
  address?: string;
  description?: string;
  contactInfo?: {
    contactPerson?: string;
    contactEmail?: string;
  };
}

export interface SwishPaymentResponse {
  success: boolean;
  data?: {
    swishPayment: SwishPayment;
    receipt?: any;
  };
  message?: string;
}

export interface SwishPaymentSearchParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  category?: string;
  status?: SwishPaymentStatus;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface SwishPaymentListResponse {
  success: boolean;
  data: SwishPayment[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  stats?: {
    totalPayments: number;
    averagePaymentAmount: number;
    statusCounts: {
      COMPLETED: number;
      PENDING: number;
      FAILED: number;
    };
  };
  message?: string;
}

export interface SwishPayment {
  _id: string;
  swish_id: string;
  reference: string;
  name: string;
  category: string;
  amounts: { amount: number; description: string }[];
  totalAmount: number;
  date: string;
  status: SwishPaymentStatus;
  socialSecurityNumber?: string;
  telephoneNumber?: string;
  email?: string;
  address?: string;
  description?: string;
  paymentDetails?: {
    paymentId?: string;
    relatedInvoice?: string;
    bankReference?: string;
  };
  processingInfo?: {
    status?: string;
    processingTime?: string;
    notes?: string;
  };
  contactInfo?: {
    contactPerson?: string;
    contactEmail?: string;
  };
  receipt_id?: {
    receiptNumber: string;
    receiptDate: string;
    subtotal: number;
    moms: number;
    totally: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SwishService {
  private backendUrl = environment.BACKEND_URL;

  constructor(private http: HttpClient) {}

  /**
   * Search customer by customer number
   * @param customerNumber The unique customer identifier
   */
  searchCustomerByNumber(customerNumber: string): Observable<CustomerSearchResponse> {
    return this.http.get<CustomerSearchResponse>(
      `${this.backendUrl}/api/customers/search/${customerNumber}`
    );
  }

  /**
   * Create a new Swish payment
   * @param paymentData The Swish payment details
   */
  createSwishPayment(paymentData: SwishPaymentRequest): Observable<SwishPaymentResponse> {
    return this.http.post<SwishPaymentResponse>(
      `${this.backendUrl}/api/swish`, 
      paymentData
    );
  }

  /**
   * Fetch Swish payments with advanced filtering and pagination
   * @param params Search and filter parameters
   */
  getSwishPayments(params: SwishPaymentSearchParams = {}): Observable<SwishPaymentListResponse> {
    // Convert params to HttpParams
    let httpParams = new HttpParams();
    
    // Add parameters if they exist
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.searchTerm) httpParams = httpParams.set('searchTerm', params.searchTerm);
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params.minAmount !== undefined) httpParams = httpParams.set('minAmount', params.minAmount.toString());
    if (params.maxAmount !== undefined) httpParams = httpParams.set('maxAmount', params.maxAmount.toString());

    return this.http.get<SwishPaymentListResponse>(`${this.backendUrl}/api/swish`, { params: httpParams });
  }

  /**
   * Delete a Swish payment by its ID
   * @param swishId The unique identifier of the Swish payment
   */
  deleteSwishPayment(swishId: string | null | undefined): Observable<{ success: boolean; message?: string }> {
    if (!swishId) {
      return of({ 
        success: false, 
        message: 'Invalid payment identifier' 
      });
    }

    return this.http.delete<{ success: boolean; message?: string }>(
      `${this.backendUrl}/api/swish/${swishId}`
    );
  }
}
