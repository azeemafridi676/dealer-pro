import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface InvoiceItem {
  product: string;
  number: number;
  unit: string;
  priceExclVAT: number;
  vatRate: number;
  amount?: number;
}

export interface InvoiceData {
  _id?: string;
  receipt_id?: string;
  corp_id?: string;
  created_by?: string;
  organization?: string;
  customer?: string | {
    name?: string;
    email?: string;
    telephone?: string;
  };
  receiptNumber: string;
  invoiceItems: InvoiceItem[];
  subtotal: number;
  moms: number;
  totally: number;
  customerType: 'Private' | 'Company' | 'Agency' | 'Client';
  
  // Make these optional to support both Company and Private types
  organizationNumber?: string;
  companyName?: string;
  businessCategory?: string;
  legalForm?: string;
  customerNumber?: string;
  customerName?: string;
  
  invoiceDate?: Date;
  dueDate: Date;
  isReference?: boolean;
  contactPerson?: string;
  email: string;
  telephoneNumber: string;
  businessDescription?: string;
  vatNumber?: string;
  website?: string;
  language?: 'English' | 'Swedish' | 'Other';
  currency?: 'SEK' | 'USD' | 'EUR';
  receiptDate?: Date;
  invoiceStatus?: 'PENDING' | 'PAID' | 'OVERDUE';
}

export interface InvoiceResponse {
  success: boolean;
  message?: string;
  data: InvoiceData[];
  totalItems?: number;
  currentPage?: number;
  totalPages?: number;
  stats?: {
    totalInvoices: number;
    totalInvoiceAmount: number;
    averageInvoiceAmount: number;
    statusCounts: {
      PAID: number;
      PENDING: number;
      OVERDUE: number;
    };
    customerTypeDistribution?: Record<string, {
      count: number;
      totalAmount: number;
    }>;
  };
  errors?: string[];
}

export interface InvoiceSearchParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  invoiceStatus?: 'PENDING' | 'PAID' | 'OVERDUE' | '';
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
  customerType?: 'Private' | 'Company' | 'Agency' | 'Client' | '';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private backendUrl = environment.BACKEND_URL;

  constructor(private http: HttpClient) {}

  /**
   * Create a new invoice
   * @param invoiceData Invoice details
   */
  createInvoice(invoiceData: InvoiceData): Observable<InvoiceResponse> {
    // Preprocess invoice data
    const processedData = {
      ...invoiceData,
      invoiceItems: invoiceData.invoiceItems.map(item => ({
        ...item,
        amount: item.priceExclVAT * item.number
      }))
    };

    return this.http.post<InvoiceResponse>(`${this.backendUrl}/api/receipts`, processedData);
  }

  /**
   * Get invoices with comprehensive filtering
   * @param params Search and filter parameters
   */
  getInvoices(params: InvoiceSearchParams = {}): Observable<InvoiceResponse> {
    // Construct query parameters
    let httpParams = new HttpParams();
    
    // Add optional parameters
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.searchTerm) httpParams = httpParams.set('searchTerm', params.searchTerm);
    if (params.invoiceStatus) httpParams = httpParams.set('invoiceStatus', params.invoiceStatus);
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params.minAmount) httpParams = httpParams.set('minAmount', params.minAmount.toString());
    if (params.maxAmount) httpParams = httpParams.set('maxAmount', params.maxAmount.toString());
    if (params.customerType) httpParams = httpParams.set('customerType', params.customerType);

    // Make actual API call
    return this.http.get<InvoiceResponse>(`${this.backendUrl}/api/receipts`, { params: httpParams });
  }

  /**
   * Delete an invoice by its ID
   * @param invoiceId Unique identifier of the invoice to delete
   */
  deleteInvoice(invoiceId: string): Observable<InvoiceResponse> {
    return this.http.delete<InvoiceResponse>(`${this.backendUrl}/api/receipts/${invoiceId}`);
  }
}