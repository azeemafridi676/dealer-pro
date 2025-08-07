import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RoleResponse } from '../../interfaces/role.interface';

export interface PaginatedUserResponse {
  success: boolean;
  data: any[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private backendUrl = environment.BACKEND_URL;

  constructor(private http: HttpClient) { }

  /**
   * Get all users in the same corporation
   * @returns Observable with the users data
   */
  getAllUsers(page: number = 1, limit: number = 10, search: string = ''): Observable<PaginatedUserResponse> {
    let params: any = { page: page.toString(), limit: limit.toString() };
    if (search && search.trim() !== '') {
      params.search = search;
    }
    return this.http.get<PaginatedUserResponse>(`${this.backendUrl}/api/users`, { params });
  }

  /**
   * Get users by corporation ID
   * @param corpId The corporation ID
   * @returns Observable with the users data
   */
  getUsersByCorporation(corpId: string): Observable<any> {
    return this.http.get(`${this.backendUrl}/api/corporations/${corpId}/users`);
  }

  /**
   * Get a single user by ID
   * @param userId The ID of the user to get
   * @returns Observable with the user data
   */
  getUserById(userId: string): Observable<any> {
    return this.http.get(`${this.backendUrl}/api/users/${userId}`);
  }

  /**
   * Create a new user
   * @param userData The user data to create
   * @returns Observable with the created user data
   */
  createUser(userData: any): Observable<any> {
    return this.http.post(`${this.backendUrl}/api/users`, userData);
  }

  /**
   * Update a user
   * @param userId The ID of the user to update
   * @param userData The user data to update
   * @returns Observable with the updated user data
   */
  updateUser(userId: string, userData: any): Observable<any> {
    return this.http.put(`${this.backendUrl}/api/users/${userId}`, userData);
  }

  /**
   * Delete a user (soft delete)
   * @param userId The ID of the user to delete
   * @returns Observable with the deletion result
   */
  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.backendUrl}/api/users/${userId}`);
  }

  /**
   * Change a user's password
   * @param userId The ID of the user
   * @param password The new password
   * @returns Observable with the password change result
   */
  changeUserPassword(userId: string, password: string): Observable<any> {
    return this.http.put(`${this.backendUrl}/api/users/${userId}/password`, { password });
  }

  getRoles(corpId: string): Observable<RoleResponse> {
    return this.http.get<RoleResponse>(`${this.backendUrl}/api/corporations/${corpId}/roles`);
  }
} 