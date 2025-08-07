import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { tap } from 'rxjs/operators';
import { LoggingService } from '../logging.service';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T | any;
  warning?: string;
}

export interface Corporation {
  _id: string;
  corp_id: string;
  corp_name: string;
  corp_active: boolean;
  allowed_resources: string[];
  allowed_resources_names: Array<{
    resource_id: string;
    title: string;
    description: string;
    icon: string;
  }>;
}

export interface Organization {
  organization_number: string;
  corp_name: string;
  street_address: string;
  registered_city: string;
  postal_code: string;
  city: string;
  company_email: string;
  company_phone: string;
  vat_number: string;
  is_f_skatt_payer: boolean;
  contact_person: string;
  business_description: string;
  business_category: string;
  legal_form: string;
  website: string;
  established_year: number;
  company_status: string;
}

export interface Resource {
  resource_id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
}

export interface PaginatedCorporationResponse {
  success: boolean;
  data: Corporation[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

export interface UserData {
  user_id?: string;
  corp_id: string;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  mobile?: string;
  user_type?: string;
  role_id?: string;
  is_active?: boolean;
}

export interface OrgSearchResponse {
  _id?: any;
  organization_number: string;
  corp_name: string;
  street_address: string;
  registered_city: string;
  postal_code: string;
  city: string;
  company_email: string;
  company_phone: string;
  contact_person?: string;
  business_description?: string;
  business_category?: string;
  legal_form?: string;
  vat_number?: string;
  website?: string;
  established_year?: number;
  company_status?: string;
  [key: string]: any; // Allow any additional properties
}

export interface FullOrganizationRegistration {
  corp_id?: string;
  organization_number: string;
  corp_name: string;
  street_address?: string;
  registered_city?: string;
  postal_code?: string;
  city?: string;
  company_email?: string;
  company_phone?: string;
  allowed_resources: string[];
  admin_data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    role_id?: string;
  };
}

export interface Role {
  role_id: string;
  name: string;
  description: string;
  is_system: boolean;
  permissions?: any;
}

export interface FullCorporationDetailsResponse {
  corporation: Corporation;
  organization: OrgSearchResponse | null;
  warning?: string;
}

export interface CurrentCorporationResponse {
  corporation: Corporation;
  organization: Organization;
}

@Injectable({
  providedIn: 'root'
})
export class CorporationService {
  private readonly SOURCE = 'corporation.service.ts';
  private apiUrl = `${environment.BACKEND_URL}/api`;
  private orgApiUrl = `${environment.BACKEND_URL}/api/orgs`;
  private rbacApiUrl = `${environment.BACKEND_URL}/api/rbac`;

  private corporationsSubject = new BehaviorSubject<Corporation[]>([]);
  corporations$ = this.corporationsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private loggingService: LoggingService
  ) {}

  /**
   * Get all corporations with pagination and search
   */
  getAllCorporations(page: number = 1, limit: number = 10, search: string = ''): Observable<PaginatedCorporationResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('search', search);

    return this.http.get<PaginatedCorporationResponse>(`${this.apiUrl}/corporations`, { params });
  }

  /**
   * Get a single corporation by ID
   */
  getCorporation(id: string): Observable<ApiResponse<Corporation>> {
    return this.http.get<ApiResponse<Corporation>>(`${this.apiUrl}/corporations/${id}`);
  }

  /**
   * Create a new corporation
   */
  createCorporation(corporation: any): Observable<ApiResponse<any>> {
    const admin_data = {
      first_name: corporation.admin_full_name?.split(' ')[0] || '',
      last_name: corporation.admin_full_name?.split(' ').slice(1).join(' ') || '',
      email: corporation.admin_email,
      phone: corporation.admin_phone,
      password: corporation.admin_password,
      role_id: corporation.role_id
    };
    const payload = {
      ...corporation,
      admin_data,
      allowed_resources: corporation.allowed_resources || []
    };
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/corporations/organizations/register`, payload)
      .pipe(
        tap((response: any) => {
          const currentCorps = this.corporationsSubject.getValue();
          if (response.data) {
            this.corporationsSubject.next([...currentCorps, response.data]);
          }
        })
      );
  }

  /**
   * Update an existing corporation
   */
  updateCorporation(id: string, corporation: Partial<Corporation>): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/corporations/${id}`, {
      ...corporation,
      allowed_resources: corporation.allowed_resources || []
    })
      .pipe(
        tap((response: any) => {
          const currentCorps = this.corporationsSubject.getValue();
          const index = currentCorps.findIndex(corp => corp._id === id);
          if (index !== -1 && response.data) {
            currentCorps[index] = response.data;
            this.corporationsSubject.next([...currentCorps]);
          }
        })
      );
  }

  /**
   * Delete a corporation
   */
  deleteCorporation(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/corporations/${id}`)
      .pipe(
        tap(response => {
          const currentCorps = this.corporationsSubject.getValue();
          this.corporationsSubject.next(currentCorps.filter(corp => corp._id !== id));
        })
      );
  }

  /**
   * Get current corporations from the subject
   */
  getCurrentCorporations(): Observable<ApiResponse<CurrentCorporationResponse>> {
    return this.http.get<ApiResponse<CurrentCorporationResponse>>(`${this.apiUrl}/corporations/current`);
  }

  /**
   * Get available resources
   */
  getAvailableResources(): Observable<ApiResponse<Resource[]>> {
    return this.http.get<ApiResponse<Resource[]>>(`${this.apiUrl}/corporations/resources`);
  }

  /**
   * Add resources to a corporation
   */
  addResourcesToCorporation(corporationId: string, resourceIds: string[]): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/corporations/${corporationId}/resources`, { resourceIds });
  }

  /**
   * Remove resources from a corporation
   */
  removeResourcesFromCorporation(corporationId: string, resourceIds: string[]): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/corporations/${corporationId}/resources`, { body: { resourceIds } });
  }

  /**
   * Get allowed resources for the current corporation
   */
  getAllowedResources(): Observable<ApiResponse<Resource[]>> {
    return this.http.get<ApiResponse<Resource[]>>(`${this.apiUrl}/corporations/allowed-resources`);
  }

  /**
   * Create a new user in a corporation
   */
  createUserInCorporation(userData: UserData): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/corporations/users`, userData);
  }

  /**
   * Update a user in a corporation
   */
  updateUserOfCorporation(userId: string, userData: Partial<UserData>): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/corporations/users/${userId}`, userData);
  }

  /**
   * Deactivate a user in a corporation
   */
  deactivateUser(userId: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/corporations/users/${userId}`, { is_active: false });
  }

  /**
   * Get notifications for a user
   */
  getNotificationsForUser(userId: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/corporations/users/${userId}/notifications`);
  }

  /**
   * Get lists for a user
   */
  getListsForUser(userId: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/corporations/users/${userId}/lists`);
  }

  /**
   * Get subscriptions for a user
   */
  getSubscriptionsForUser(userId: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/corporations/users/${userId}/subscriptions`);
  }

  /**
   * Search organization by organization number
   */
  searchOrganization(orgNumber: string): Observable<ApiResponse<OrgSearchResponse>> {
    return this.http.post<ApiResponse<OrgSearchResponse>>(`${this.apiUrl}/orgs/search`, { organization_number: orgNumber });
  }

  /**
   * Register full organization (creates org, corp, and admin user)
   */
  registerFullOrganization(data: FullOrganizationRegistration): Observable<ApiResponse<any>> {
    const payload = {
      organization_number: data.organization_number,
      corp_name: data.corp_name,
      street_address: data.street_address,
      registered_city: data.registered_city,
      postal_code: data.postal_code,
      city: data.city,
      company_email: data.company_email,
      company_phone: data.company_phone,
      allowed_resources: Array.from(data.allowed_resources),
      admin_data: {
        first_name: data.admin_data.first_name,
        last_name: data.admin_data.last_name,
        email: data.admin_data.email,
        phone: data.admin_data.phone,
        password: data.admin_data.password,
        role_id: data.admin_data.role_id
      }
    };

    return this.http.post<ApiResponse<any>>(`${this.orgApiUrl}/register`, payload)
      .pipe(
        tap(response => {
          const currentCorps = this.corporationsSubject.getValue();
          this.corporationsSubject.next([...currentCorps, response.data]);
        })
      );
  }

  /**
   * Get available roles
   */
  getRoles(): Observable<ApiResponse<Role[]>> {
    return this.http.get<ApiResponse<Role[]>>(`${this.rbacApiUrl}/roles`).pipe(
      tap(response => {
      })
    );
  }

  /**
   * Public search organization by organization number (no auth)
   */
  publicSearchOrganization(organizationNumber: string): Observable<ApiResponse<OrgSearchResponse>> {
    return this.http.post<ApiResponse<OrgSearchResponse>>(
      `${this.orgApiUrl}/public-search`,
      { organization_number: organizationNumber }
    ).pipe(
      tap(response => {
      })
    );
  }

  /**
   * Get full corporation details including organization data
   */
  getFullCorporationDetails(corpId: string): Observable<ApiResponse<FullCorporationDetailsResponse>> {
    return this.http.get<ApiResponse<FullCorporationDetailsResponse>>(`${this.apiUrl}/corporations/${corpId}/full-details`).pipe(
      tap((response: any) => {
        if (response?.data?.warning) {
          // Handle warning
        } else {
          // Handle success
        }
      })
    );
  }

  /**
   * Update full organization (updates org and corp details)
   */
  updateFullOrganization(data: FullOrganizationRegistration & { 
    corp_active?: boolean, 
    allowed_resources?: string[] 
  }): Observable<ApiResponse<any>> {
    const payload = {
      corp_id: data.corp_id,
      organization_number: data.organization_number,
      corp_name: data.corp_name,
      street_address: data.street_address,
      registered_city: data.registered_city,
      postal_code: data.postal_code,
      city: data.city,
      company_email: data.company_email,
      company_phone: data.company_phone,
      corp_active: data.corp_active,
      allowed_resources: data.allowed_resources
    };

    return this.http.put<ApiResponse<any>>(`${this.orgApiUrl}/update`, payload)
      .pipe(
        tap(response => {
          if (response.success) {
            // Update the corporations subject if needed
            const currentCorps = this.corporationsSubject.getValue();
            const index = currentCorps.findIndex(corp => corp._id === response.data.corporation.corp_id);
            if (index !== -1) {
              currentCorps[index] = response.data.corporation;
              this.corporationsSubject.next([...currentCorps]);
            }
          }
        })
      );
  }

  /**
   * Check if organization exists in DB only
   */
  checkOrganizationExists(organizationNumber: string): Observable<ApiResponse<OrgSearchResponse>> {
    return this.http.post<ApiResponse<OrgSearchResponse>>(
      `${this.orgApiUrl}/check-exists`,
      { organization_number: organizationNumber }
    );
  }
} 