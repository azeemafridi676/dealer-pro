import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../Auth/Auth.service';

@Injectable({
    providedIn: 'root'
})
export class RolesService {
    private backendUrl = environment.BACKEND_URL;
    private GET_ALL_ROLES = `${this.backendUrl}/api/roles/get-all-roles/`;
    private UPDATE_ROLE_PERMISSIONS = `${this.backendUrl}/api/roles/update-role-permissions/`;
    private CREATE_ROLE = `${this.backendUrl}/api/rbac/roles`;

    constructor(
        private http: HttpClient,
        private authService: AuthService
    ) { }

    getResources(): Observable<any> {
        return this.http.get<any>(`${this.backendUrl}/api/rbac/roles`);
    }
    updateAllRolesPermissions(updatedRoles: any[]): Observable<any> {
        return this.http.post(`${this.backendUrl}/api/rbac/roles/${updatedRoles[0].roleId}/permissions`, { permissions: updatedRoles[0].permissions });
    }
    createRole(roleData: any): Observable<any> {
        return this.http.post(`${this.backendUrl}/api/rbac/roles`, roleData);
    }
 
}
