import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// Define interfaces to match backend response
export interface Customer {
  _id?: string;
  name?: string;
}

export interface RecentUser {
  _id: string;
  first: string;
  last: string;
  email: string;
  role: string;
  active: boolean;
  lastLogin?: Date;
}

export interface RecentVehicle {
  _id: string;
  legalId: string;
  detail: {
    modelNumber: string;
    vehicleBrandRaw: string;
    vehicleYear: string;
  };
  status: {
    code: string;
  };
}

export interface RecentAgreement {
  _id: string;
  agreementType: string;
  status: string;
  contractDate: Date;
  customerName?: string;
}

export interface RecentReceipt {
  _id: string;
  customer: Customer | null;
  receiptNumber: string;
  currency?: string;
  invoiceStatus: string;
  totally?: number;
}

export interface DashboardData {
  totalUsers: number;
  activeUsers: number;
  totalVehicles: number;
  vehicleStatusCounts: Array<{_id: string, count: number}>;
  totalRevenue: number;
  recentUsers: RecentUser[];
  recentVehicles: RecentVehicle[];
  recentAgreements: RecentAgreement[];
  recentReceipts: RecentReceipt[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private backendUrl = environment.BACKEND_URL;

  constructor(private http: HttpClient) {}

  /**
   * Fetch dashboard data
   */
  getDashboardData(): Observable<{ success: boolean, data: DashboardData }> {
    return this.http.get<{ success: boolean, data: DashboardData }>(`${this.backendUrl}/api/dashboard`);
  }
}
