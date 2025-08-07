// auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, throwError } from 'rxjs';
import { jwtDecode } from 'jwt-decode'
import { environment } from 'src/environments/environment';
import { SignUpData, LoginData, LoginResponse, SignUpResponse } from '../../model/user.model'; // Adjust the path as needed
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { LoggingService } from '../logging.service';
import { PermissionService } from '../permissions/permission.service';
import { ThemeService } from '../theme.service';

// Update user model interface
export interface UserDetails {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  type: string;
  corp: {
    corp_id: string;
    corp_name: string;
  };
  organization?: {
    organization_number?: string;
    organization_name?: string;
    organization_email?: string;
    organization_phone?: string;
    business_category?: string;
    legal_form?: string;
  } | null;
  theme?: string;
  logo?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private backendUrl = environment.BACKEND_URL;
  private SIGNUP = `${this.backendUrl}/api/auth/signup`;
  private PROFILE_DETAIL = `${this.backendUrl}/api/auth/profile/detail`;
  private UPDATE_PROFILE = `${this.backendUrl}/api/auth/profile/update-profile`;
  private LOGIN = `${this.backendUrl}/api/auth/login`;
  private RESEND_OTP = `${this.backendUrl}/api/auth/resend-otp`;
  private VERIFYOTP = `${this.backendUrl}/api/auth/verify-otp`;
  private VERIFYTOKEN = `${this.backendUrl}/api/auth/verify-token`;
  private FORGETPASSWORD = `${this.backendUrl}/api/auth/forgot-password`;
  private REFRESHTOKEN = `${this.backendUrl}/api/auth/refresh-token`;
  private RESETPASSWORD = `${this.backendUrl}/api/auth/reset-password`;
  private CHANGEPASSWORD = `${this.backendUrl}/api/auth/change-password`;
  private LOGOUT = `${this.backendUrl}/api/auth/logout`;
  private DELETE_ACCOUNT = `${this.backendUrl}/api/profile/delete-account`;
  private GOOGLE_AUTH = `${this.backendUrl}/api/auth/google`;
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  
  private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();

  constructor(
    private router: Router,
    private http: HttpClient,
    private loggingService: LoggingService,
    private permissionService: PermissionService,
    private themeService: ThemeService
  ) {
    this.deviceId = this.generateDeviceId();
  }
  private verificationIdSubject = new BehaviorSubject<string | null>(null);
  private loginData = new BehaviorSubject<any>(null);
  private userDetail = new BehaviorSubject<any>(null);
  private readonly SOURCE = 'Auth.service.ts';
  private deviceId: string;
  private orgRegistrationData = new BehaviorSubject<any>(null);

  getAuthenticated(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  setLoginData(data: any): void {
    this.loginData.next(data);
  }
  getLoginData(): Observable<any> {
    return this.loginData.asObservable();
  }
  setVerificationId(verificationId: string): void {
    this.verificationIdSubject.next(verificationId);
  }
  getVerificationId(): Observable<string | null> {
    return this.verificationIdSubject.asObservable();
  }
  setUserDetails(data: any): void {
    this.userDetail.next(data);
  }
  getUserDetails(): Observable<any> {
    return this.userDetail.asObservable();
  }
  setOrgRegistrationData(data: any): void {
    this.orgRegistrationData.next(data);
  }
  getOrgRegistrationData(): Observable<any> {
    return this.orgRegistrationData.asObservable();
  }
  signUp(userData: SignUpData): Observable<SignUpResponse> {
    this.setLoginData(userData)
    return this.http.post<SignUpResponse>(this.SIGNUP, userData);
  }
  updateProfile(userData: any): Observable<any> {
    return this.http.post<SignUpResponse>(this.UPDATE_PROFILE, userData);
  }
  getUserProfileData(): Observable<any> {
    const userId = this.getUserIdFromToken();
    if(userId){
      return this.http.get<any>(this.PROFILE_DETAIL).pipe(
        tap((response: any) => {
          const data = response.user;
          this.setUserDetails(data);
          this.userSubject.next(data);
          this.isAuthenticatedSubject.next(true);
          
          // Set theme if available in user data
          if (data?.theme) {
            this.themeService.setColor(data.theme);
          }
        }),
        map((response: any) => response.user) 
      );
    }
    return of(null);
  }
  login(userData: LoginData): Observable<LoginResponse> {
    const loginPayload = {
      ...userData,
      deviceId: this.deviceId,
      deviceName: this.getDeviceName()
    };
    this.setLoginData(loginPayload);
    return this.http.post<LoginResponse>(this.LOGIN, loginPayload).pipe(
      tap((response: any) => {
        if (response.success) {
          // this.storeTokens(response.data.tokens);
          // this.isAuthenticatedSubject.next(true);
          // this.loadPermissions();
        }
      })
    );
  }
  resendOtpCode(): Observable<LoginResponse> {
    return this.getLoginData().pipe(
      switchMap(data => {
        if (!data?.email) {
          return throwError(() => new Error('No email found'));
        }
        return this.http.post<LoginResponse>(this.RESEND_OTP, {
          email: data.email,
          deviceId: this.deviceId,
          deviceName: this.getDeviceName()
        });
      })
    );
  }
  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(this.FORGETPASSWORD, { email });
  }
  resetPassword(token:string,password: string): Observable<void> {
    return this.http.post<void>(this.RESETPASSWORD, { token , password });
  }
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(this.CHANGEPASSWORD, { currentPassword, newPassword });
  }
  deleteAccount(): Observable<void> {
    return this.http.delete<void>(this.DELETE_ACCOUNT).pipe(
      tap(() => {
        this.clearTokens();
        this.isAuthenticatedSubject.next(false);
        this.userSubject.next(null);
        this.router.navigate(['/login']);
      })
    );
  }
  verifyOtp(otp: string): Observable<any> {
    return this.getLoginData().pipe(
      switchMap(loginData => {
        if (!loginData?.email) {
          return throwError(() => new Error('No login data found'));
        }

        const verifyPayload = {
          email: loginData.email,
          otp: otp,
          deviceId: this.deviceId
        };

        return this.http.post<any>(this.VERIFYOTP, verifyPayload).pipe(
          tap(response => {
            if (response.data?.tokens) {
              this.storeTokens(response.data.tokens);
              this.isAuthenticatedSubject.next(true);
            }
          })
        );
      })
    );
  }
  verifyToken(accessToken: string, refreshToken: string): Observable<boolean> {
    return this.http.post<any>(this.VERIFYTOKEN, { accessToken, refreshToken }).pipe(
      switchMap(response => {
        if (response.data.valid) {
          const prevAuthState = this.isAuthenticatedSubject.value;
          if (response.data.accessToken) {
            this.storeTokens(response.data);
          }
          this.isAuthenticatedSubject.next(true);
          return of(true);
        } else {
          this.logout();
          return of(false);
        }
      }),
      catchError(() => {
        this.logout();
        return of(false);
      })
    );
  }
  logout(): void {
    const userId = this.getUserIdFromToken();
    if (userId) {
    // this.http.post<any>(this.LOGOUT, { userId }).pipe(
    //   tap(() => {
    //     this.clearTokens();
    //     this.isAuthenticatedSubject.next(false);
    //     this.userSubject.next(null);
    //     this.router.navigate(['/login']);
    //   }),
    //   catchError((error) => {
    //     throw new Error('Failed to logout. Please try again.');
    //     })
    //   ).subscribe();
    this.clearTokens();
    this.isAuthenticatedSubject.next(false);
    this.userSubject.next(null);
    this.router.navigate(['/login']);  
  } else {
    }
  }
  storeTokens(tokens: { accessToken: string; refreshToken: string }): void {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    this.isAuthenticatedSubject.next(true);
    this.loadPermissions();
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }
  getDecodedToken(): any {
    const token = this.getAccessToken();
    if (token) {
      return jwtDecode(token);
    }
    return null;
  }
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }
  refreshToken(refreshToken: string): Observable<any> {
    return this.http.post<any>(this.REFRESHTOKEN, { refreshToken }).pipe(
      tap(response => {
        if (response.data) {
          this.storeTokens(response.data);
          this.isAuthenticatedSubject.next(true);
        } else {
          this.logout();
        }
      })
    );
  }
  getUserIdFromToken(): string | null {
    const token = this.getAccessToken();
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        return decodedToken.user_id || null; // Adjust key based on your token structure
      } catch (error) {
        console.error('Failed to decode token:', error);
        return null;
      }
    }
    return null;
  }
  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
  getCurrentUserId(): string | null {
    return this.getUserIdFromToken();
  }
  isAdmin(): boolean {
    const user = this.userSubject.getValue();
    return user?.role === 'admin';
  }
  // Helper method to check if token is expired
  private isTokenExpired(token: string): boolean {
    if (!token) return true;
    
    try {
      const decodedToken: any = jwtDecode(token);
      return decodedToken.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
  // Method to handle token refresh
  setupTokenRefresh(): void {
    const token = this.getAccessToken();
    if (token) {
      const decodedToken: any = jwtDecode(token);
      const expiresIn = decodedToken.exp * 1000 - Date.now();
      
      if (expiresIn > 0) {
        setTimeout(() => {
          const refreshToken = this.getRefreshToken();
          if (refreshToken) {
            this.refreshToken(refreshToken).subscribe();
          } else {
            this.logout();
          }
        }, expiresIn - 60000); // Refresh 1 minute before expiration
      }
    }
  }
  // Add Google OAuth methods
  initiateGoogleAuth(): void {
    window.location.href = this.GOOGLE_AUTH;
  }

  handleGoogleCallback(accessToken: string, refreshToken: string): void {
    this.storeTokens({ accessToken, refreshToken });
    this.isAuthenticatedSubject.next(true);
    
    this.getUserProfileData().subscribe({
      next: (userData) => {
        this.userSubject.next(userData);
        this.loadPermissions();
      },
      error: (error) => {
        this.clearTokens();
        this.isAuthenticatedSubject.next(false);
      }
    });
  }

  // Generate a unique device ID
  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  // Get device name
  private getDeviceName(): string {
    const userAgent = navigator.userAgent;
    const browser = this.getBrowserName(userAgent);
    const os = this.getOSName(userAgent);
    return `${browser} on ${os}`;
  }

  private getBrowserName(userAgent: string): string {
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  }

  private getOSName(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown OS';
  }

  private loadPermissions(): void {
    this.permissionService.loadPermissions().subscribe({
      next: () => {
      },
      error: (error) => {
      }
    });
  }

  completeSignUp(): Observable<SignUpResponse> {
    // Combine user and org data for final signup
    return this.getLoginData().pipe(
      switchMap(userData =>
        this.getOrgRegistrationData().pipe(
          switchMap(orgData => {
            if (!userData || !orgData) {
              return throwError(() => new Error('Missing user or organization data'));
            }
            const payload = { ...userData, ...orgData };
            return this.http.post<SignUpResponse>(this.SIGNUP, payload);
          })
        )
      )
    );
  }
}
