import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface CustomerCreationData {
  name: string;
  email: string;
  telephone: string;
  address: string;
  type: string;
  status: string;
  postalCode?: string;
  location?: string;
  socialSecurityNumber?: string;
  organizationNumber?: string;
}

export interface CustomerStats {
  privateCustomers: number;
  companyCustomers: number;
  totalCustomers: number;
  purchaseAgreements: number;
  salesAgreements: number;
  otherAgreements: number;
}

export interface CustomerUpdateData {
  name: string;
  email: string;
  telephone: string;
  address: string;
  type: string;
  status: string;
  socialSecurityNumber?: string;
  organizationNumber?: string;
  postalCode?: string;
  location?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private backendUrl = environment.BACKEND_URL;

  constructor(private http: HttpClient) { }

  /**
   * Get all customers with pagination and filtering
   */
  getAllCustomers(page: number = 1, limit: number = 10, filters: any = {}): Observable<any> {
    let params: any = {
      page,
      limit,
      ...filters
    };
    
    return this.http.get(`${this.backendUrl}/api/customers`, { params });
  }

  /**
   * Create a new customer
   */
  createCustomer(customerData: CustomerCreationData): Observable<any> {
    return this.http.post(`${this.backendUrl}/api/customers`, customerData);
  }

  /**
   * Update an existing customer
   */
  updateCustomer(customerId: string, customerData: CustomerUpdateData): Observable<any> {
    return this.http.put(`${this.backendUrl}/api/customers/${customerId}`, customerData);
  }

  /**
   * Delete a customer by ID
   */
  deleteCustomer(customerId: string): Observable<any> {
    return this.http.delete(`${this.backendUrl}/api/customers/${customerId}`);
  }

  /**
   * Search for a person by phone number
   */
  searchBySSN(phoneNumber: string): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/api/customers/search-person`, { phoneNumber });
  }

  /**
   * Check if customers exist for a specific type
   * @param type Customer type to check
   */
  checkCustomerTypeExists(type: string): Observable<{ hasCustomers: boolean, totalCustomers: number }> {
    // Validate customer type
    if (!['Private Individual', 'Company'].includes(type)) {
      throw new Error('Invalid customer type. Must be "Private Individual" or "Company".');
    }

    return this.http.get<{ hasCustomers: boolean, totalCustomers: number }>(`${this.backendUrl}/api/customers/type-exists`, { 
      params: { customerType: type } 
    });
  }

  /**
   * Search for a customer by customer number
   * @param customerNumber Customer number to search
   * @param customerType Expected customer type
   */
  searchCustomerByNumber(customerNumber: string, customerType?: string): Observable<any> {
    const params: { customerNumber: string, customerType?: string } = { customerNumber };
    
    if (customerType) {
      params.customerType = customerType;
    }

    return this.http.get<any>(`${this.backendUrl}/api/customers/search-by-number`, { 
      params 
    });
  }

  /**
   * Search for an organization by organization number
   * @param organizationNumber Organization number to search
   */
  searchOrganization(organizationNumber: string): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/api/orgs/public-search`, { 
      organization_number: organizationNumber 
    });
  }

  /**
   * Search for a person by social security number
   * @param socialSecurityNumber Social security number to search
   */
  searchPersonBySSN(socialSecurityNumber: string): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/api/customers/search-person`, { 
      phoneNumber: socialSecurityNumber 
    });
  }
}
