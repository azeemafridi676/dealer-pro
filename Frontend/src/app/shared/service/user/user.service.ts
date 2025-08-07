import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  role: 'driver' | 'admin' | 'user';
  profileImage: string | null;
  status: 'online' | 'offline';
  isBanned: boolean;
  banReason?: string | null;
  bannedAt?: Date | null;
  bannedBy?: string | null;
  currentSubscription?: string;
  subscriptionStatus: 'active' | 'inactive' | 'payment_failed';
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  isGiftedSubscription: boolean;
  giftedBy: string | null;
  giftedAt: Date | null;
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

export interface PaginatedResponse {
  users: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

@Injectable({
  providedIn: "root",
})
export class UserService {
  private apiUrl = `${environment.BACKEND_URL}/api/user`;

  constructor(private http: HttpClient) {}

  getAllUsers(page: number = 1, limit: number = 10, search: string = ''): Observable<ApiResponse<PaginatedResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('search', search);

    return this.http.get<ApiResponse<PaginatedResponse>>(`${this.apiUrl}/users/list`, { params });
  }

  banUser(userId: string, reason?: string): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.apiUrl}/users/ban/${userId}`, { reason });
  }

  unbanUser(userId: string): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.apiUrl}/users/unban/${userId}`, {});
  }
}
