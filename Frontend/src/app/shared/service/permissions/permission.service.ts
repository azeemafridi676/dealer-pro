import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { catchError, map, tap } from 'rxjs/operators';

interface Resource {
  resource_id: string;
  title: string;
  route: string;
  icon: string;
  position:string;
  has_subresources?: boolean;
  subresources?: any[];
  permissions: {
    can_read: boolean;
    can_create: boolean;
    can_update: boolean;
    can_delete: boolean;
  };
}

interface Resources {
  [key: string]: Resource;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private backendUrl = environment.BACKEND_URL;
  private permissionsSubject = new BehaviorSubject<Resources>({});
  private resourcesSubject = new BehaviorSubject<Resources>({});
  
  permissions$ = this.permissionsSubject.asObservable();
  resources$ = this.resourcesSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadPermissions(): Observable<any> {
    return this.http.get(`${environment.BACKEND_URL}/api/rbac/user-permissions`).pipe(
      tap((response: any) => {
        if (response.success) {
          this.permissionsSubject.next(response.data.resources);
          this.resourcesSubject.next(response.data.resources);
        }
      })
    );
  }

  getPermissions(): Resources {
    return this.permissionsSubject.getValue();
  }

  hasPermission(resourceId: string, action: 'read' | 'create' | 'update' | 'delete'): boolean {
    const resources = this.getPermissions();
    if (!resources) return false;

    // Find resource by resource_id
    const resource = Object.values(resources).find(r => r.resource_id === resourceId);
    if (!resource) return false;

    return resource.permissions[`can_${action}`] || false;
  }

  canRead(path: string): boolean {
    const resources = this.getPermissions();
    if (!resources) return false;

    // Find the resource that matches the path
    const resource = Object.values(resources).find(r => r.route === path);
    if (!resource) return false;

    return resource.permissions.can_read;
  }

  canCreate(resourceId: string): boolean {
    return this.hasPermission(resourceId, 'create');
  }

  canUpdate(resourceId: string): boolean {
    return this.hasPermission(resourceId, 'update');
  }

  canDelete(resourceId: string): boolean {
    return this.hasPermission(resourceId, 'delete');
  }

  
}
