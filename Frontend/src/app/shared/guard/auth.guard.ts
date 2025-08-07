import { CanActivate  } from '@angular/router';
import { AuthService } from '../service/Auth/Auth.service'; 
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate  {

  constructor(private authService: AuthService, private router: Router) {}

   canActivate(): Observable<boolean> {
      const token = this.authService.getAccessToken();
      const refreshToken = this.authService.getRefreshToken();
      if (!token || !refreshToken) {
        this.router.navigate(['/login']);
        return of(false); 
      }
      return of(true);
  }
}
