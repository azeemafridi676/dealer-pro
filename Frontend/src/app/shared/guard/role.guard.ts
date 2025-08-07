import { CanActivate, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../service/Auth/Auth.service'; 
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { Injectable } from '@angular/core';
@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate  {

  constructor(private authService: AuthService, private router: Router) {}

   canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
      const expectedRoles = route.data['roles'] as Array<string>;
      const token = this.authService.getAccessToken();
      const refreshToken = this.authService.getRefreshToken();
      if (!token || !refreshToken) {
        this.router.navigate(['/login']);
        return of(false); 
      }

      let hasRole = false;
      const decodedToken = this.authService.getDecodedToken();
      console.log("**************",decodedToken);
      hasRole = expectedRoles.some(role => decodedToken.role?.toLowerCase().includes(role.toLowerCase()));
      if (!hasRole) {
        this.authService.logout();
        return of(false);
      }
      return of(true); 
  }
}
