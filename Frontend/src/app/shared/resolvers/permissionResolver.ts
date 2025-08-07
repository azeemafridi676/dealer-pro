import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { catchError, Observable, of, tap } from 'rxjs';
import { PermissionService } from '../service/permissions/permission.service';
@Injectable({
  providedIn: 'root'
})
export class PermissionsResolver implements Resolve<any> {
  constructor(private permissionService: PermissionService) {}

  resolve(): Observable<any> {
    return this.permissionService.loadPermissions().pipe(
      tap(permissions => console.log('Permissions loaded:', permissions)),
      catchError(error => {
        console.error('Error loading permissions:', error);
        return of(null);
      })
    );
  }
}