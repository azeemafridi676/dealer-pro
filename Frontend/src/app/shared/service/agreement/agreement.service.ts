import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

interface AgreementResponse {
  success: boolean;
  message?: string;
  data: any[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  stats?: {
    purchaseAgreements: number;
    salesAgreements: number;
    brokerageAgreements: number;
    purchasedVehicles: number;
    soldVehicles: number;
    brokeredVehicles: number;
  };
}

interface CreateAgreementResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface SalesAgreementData {
  // Basic Information
  registrationNumber: string;
  salesDate: string;
  customerType: string;
  emailAddress: string;
  telephoneNumber: string;

  // Seller Information
  sellerName?: string;
  sellerOrganizationName?: string;
  sellerOrganizationNumber?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  sellerAddress?: string;
  sellerBusinessCategory?: string;
  sellerLegalForm?: string;

  // Company specific fields
  organizationNumber?: string;
  companyName?: string;
  streetAddress?: string;
  city?: string;
  postalCode?: string;
  contactPerson?: string;
  businessCategory?: string;
  legalForm?: string;

  // Private individual specific fields
  customerName?: string;
  socialSecurityNumber?: string;
  street?: string;
  zip?: string;
  personData?: {
    _type: string;
    id: string;
    country: string;
    legalId: string;
    birthDate: string;
    gender: string;
    name: {
      country: string;
      names: string[];
      lastName: string;
      givenName: string;
    };
    addresses: Array<{
      _type: string;
      kind: string;
      country: string;
      street: string;
      number: string;
      numberSuffix?: string;
      flat?: string;
      zip: string;
      city: string;
      county?: string;
      municipality?: string;
      id: string;
    }>;
  };

  // Trade-in Vehicle Information
  tradeInVehicle: string;
  tradeInRegistrationNumber?: string;
  tradeInPurchaseDate?: string;
  tradeInPurchasePrice?: number;
  tradeInMileage?: number;
  tradeInCreditMarking?: string;
  tradeInCreditor?: string;
  tradeInCreditAmount?: number;
  tradeInVehicleDetails?: any;

  // Sales Information
  salesPrice: number;
  paymentMethod: string;
  vatType: string;
  mileage: number;
  numberOfKeys: string;
  deck: string;
  insurer?: string;
  insuranceType: string;
  warrantyProvider?: string;
  warrantyProduct?: string;
  freeTextPayment?: string;

  // Financing fields
  creditor?: string;
  creditAmount?: number;
  cashBet?: string;
  loanPeriod?: number;

  // Leasing fields
  leasingProvider?: string;
  leasingAmount?: number;
  leasingPeriod?: number;
}

export interface AgencyAgreementData {
  customerType: string;
  emailAddress: string;
  telephoneNumber?: string;

  // Organization details (for Company customer type)
  organization_detail?: {
    organization_number: string;
    corp_name: string;
    street_address: string;
    city: string;
    postal_code: string;
    contact_person: string;
    business_category: string;
    legal_form: string;
  };

  // Person details (for Private Individual customer type)
  person_detail?: {
    legal_id: string;
    customer_name: string;
      street: string;
      zip: string;
      city: string;
  };

  // Agency details
  agency_details: {
    registrationNumber: string;
    agencyDate: string;
    mileage: string | number;
    numberOfKeys: string;
    deck: string;
    salesPrice: string | number;
    commissionRate: string | number;
    commissionAmount: string | number;
    agencyFee: string | number;
  paymentMethod: string;
  vatType: string;
  notes?: string;
    buyer: any; // Current organization details
  };
}

export interface ReceiptAgreementData {
  // Step 1: Receipt details
  receiptNumber: string;
  receiptDate: string;
  
  // Step 2: Seller details
  sellerName: string;
  sellerOrg: string;
  sellerTelephone: string;
  sellerEmail: string;
  sellerAddress?: string;
  sellerStatus?: string;
  sellerType?: string;
  
  // Step 2: Customer details
  customerName: string;
  customerOrg: string;
  customerTelephone: string;
  customerEmail: string;
  customerAddress?: string;
  customerStatus?: string;
  customerType?: string;
  
  // Step 2: Item details
  itemDescription: string;
  itemPrice: string;
  itemNumber?: number;
  
  // Step 3: Payment summary
  subtotal: string;
  moms: string;
  totally: string;

  // Additional required fields
  customerNumber?: string;
  organizationNumber?: string;
  dueDate?: string;
  language?: string;
  currency?: string;
}

// New interface for API payload
export interface NewSalesAgreementPayload {
  customerType: string;  // 'Company' or 'Individual'
  
  sales_details: {
    registrationNumber: string;
    salesDate: string;
    emailAddress: string;
    telephoneNumber: string;
    salesPrice: number;
    paymentMethod: string;
    vatType: string;
    mileage: number;
    numberOfKeys: string;
    deck: string;
    insurer: string;
    insuranceType: string;
    warrantyProvider: string;
    warrantyProduct: string;
    freeTextPayment: string;
    
    tradeInVehicle?: {
      registrationNumber: string;
      purchaseDate: string;
      purchasePrice: number;
      mileage: number;
      creditMarking: string;
      creditor?: string;
      creditAmount?: number;
      vehicleDetails?: object;
    };
    
    financing?: {
      creditor: string;
      creditAmount: number;
      loanPeriod: number;
      cashBet?: string;
    };
    
    leasing?: {
      provider: string;
      amount: number;
      period: number;
    };
  };
  
  vehicle_details: object;  // Full vehicle details from search
  
  person_detail?: {  // For Individual customers
    _type: 'SE_PERSON';
    id: string;
    country: string;
    legalId: string;
    birthDate: string;
    gender: string;
    name: {
      names: string[];
      lastName: string;
      givenName: string;
    };
    addresses: Array<{
      street: string;
      number: string;
      zip: string;
      city: string;
    }>;
  };
  
  organization_detail?: {  // For Company customers
    organization_number: string;
    corp_name: string;
    street_address: string;
    registered_city: string;
    postal_code: string;
    city: string;
    company_email: string;
    company_phone: object;
  };
}

// Add new interface for purchase agreement payload
export interface NewPurchaseAgreementPayload {
  customerType: string;
  
  purchase_details: {
    registrationNumber: string;
    purchaseDate: string;
    emailAddress: string;
    telephoneNumber: string;
    purchasePrice: number;
    paymentMethod: string;
    vatType: string;
    creditMarking: string;
    mileage: number;
    latestService: string;
    numberOfKeys: string;
    deck: string;
    notes: string;
    creditMarkingDetails?: {
      creditor: string;
      creditAmount: number;
      depositor: string;
    };
    
    financing?: {
      creditor: string;
      creditAmount: number;
      loanPeriod: number;
      cashBet?: string;
    };
    
    leasing?: {
      provider: string;
      amount: number;
      period: number;
    };
  };
  
  vehicle_details: any;  // Full vehicle details from search
  
  customer_details: {  // For both Company and Individual customers
    // Common fields
    email: string;
    phone: string;
    
    // Company specific fields
    organization_number?: string;
    corp_name?: string;
    street_address?: string;
    registered_city?: string;
    postal_code?: string;
    city?: string;
    contact_person?: string;
    business_category?: string;
    legal_form?: string;
    
    // Individual specific fields
    _type?: string;
    id?: string;
    country?: string;
    legalId?: string;
    birthDate?: string;
    gender?: string;
    name?: {
      names: string[];
      lastName: string;
      givenName: string;
    };
    addresses?: Array<{
      street: string;
      number: string;
      zip: string;
      city: string;
    }>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AgreementService {
  private backendUrl = environment.BACKEND_URL;

  constructor(private http: HttpClient) {}

  /**
   * Get all agreements with pagination and filters
   * @param page The page number to fetch
   * @param limit The number of items per page
   * @param filters Optional filters for searching
   */
  getAgreements(page: number, limit: number, filters?: any): Observable<AgreementResponse> {
    let params = `page=${page}&limit=${limit}`;
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params += `&${encodeURIComponent(key)}=${encodeURIComponent(filters[key])}`;
        }
      });
    }
    return this.http.get<AgreementResponse>(`${this.backendUrl}/api/agreements?${params}`);
  }

  createSalesAgreement(data: NewSalesAgreementPayload): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/api/agreements/sales`, data);
  }

  createAndSignSalesAgreement(data: NewSalesAgreementPayload): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/api/agreements/sales/sign`, data);
  }

  createAgencyAgreement(agreementData: AgencyAgreementData): Observable<CreateAgreementResponse> {
    return this.http.post<CreateAgreementResponse>(`${this.backendUrl}/api/agreements/agency`, agreementData);
  }

  createAndSignAgencyAgreement(agreementData: AgencyAgreementData): Observable<CreateAgreementResponse> {
    const dataWithPdf = { ...agreementData, return_aggrement_pdf: true };
    return this.http.post<CreateAgreementResponse>(`${this.backendUrl}/api/agreements/agency`, dataWithPdf);
  }

  createPurchaseAgreement(agreementData: NewPurchaseAgreementPayload): Observable<CreateAgreementResponse> {
    return this.http.post<CreateAgreementResponse>(`${this.backendUrl}/api/agreements/purchase`, agreementData);
  }

  createAndSignPurchaseAgreement(agreementData: NewPurchaseAgreementPayload): Observable<CreateAgreementResponse> {
    return this.http.post<CreateAgreementResponse>(`${this.backendUrl}/api/agreements/purchase/sign`, agreementData);
  }

  createReceiptAgreement(agreementData: ReceiptAgreementData): Observable<CreateAgreementResponse> {
    return this.http.post<CreateAgreementResponse>(`${this.backendUrl}/api/agreements/receipt`, agreementData);
  }

  createAndSignReceiptAgreement(agreementData: ReceiptAgreementData): Observable<CreateAgreementResponse> {
    const dataWithPdf = { ...agreementData, return_aggrement_pdf: true };
    return this.http.post<CreateAgreementResponse>(`${this.backendUrl}/api/agreements/receipt`, dataWithPdf);
  }

  deleteAgreement(agreementId: string): Observable<CreateAgreementResponse> {
    return this.http.delete<CreateAgreementResponse>(`${this.backendUrl}/api/agreements/${agreementId}`);
  }

  // Get agreement details by ID
  getAgreementDetails(agreementId: string): Observable<any> {
    return this.http.get<any>(`${this.backendUrl}/api/agreements/${agreementId}`);
  }
  getAgreementDetailsPublic(agreementId: string): Observable<any> {
    return this.http.get<any>(`${this.backendUrl}/api/agreements/sign/${agreementId}`);
  }

  uploadDocument(agreementId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('document', file);
    
    return this.http.post<any>(
      `${this.backendUrl}/api/agreements/${agreementId}/upload-document`, 
      formData
    );
  }

  updateSalesAgreement(agreementId: string, data: NewSalesAgreementPayload): Observable<CreateAgreementResponse> {
    return this.http.put<CreateAgreementResponse>(
      `${this.backendUrl}/api/agreements/sales/${agreementId}`, 
      data
    );
  }

  updatePurchaseAgreement(agreementId: string, agreementData: NewPurchaseAgreementPayload): Observable<CreateAgreementResponse> {
    return this.http.put<CreateAgreementResponse>(`${this.backendUrl}/api/agreements/purchase/${agreementId}`, agreementData);
  }

  updateAgencyAgreement(agreementId: string, agreementData: AgencyAgreementData): Observable<CreateAgreementResponse> {
    return this.http.put<CreateAgreementResponse>(`${this.backendUrl}/api/agreements/agency/${agreementId}`, agreementData);
  }
}