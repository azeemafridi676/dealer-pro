import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/shared/service/Auth/Auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { LoggingService } from 'src/app/shared/service/logging.service';
import { ThemeService } from 'src/app/shared/service/theme.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  showPassword = false;
  showBanModal = false;
  banDetails: { reason: string | null; bannedAt: Date | null } | null = null;
  private readonly SOURCE = 'login.component.ts';
  currentTheme$ = this.themeService.currentTheme$;

  async ngOnInit() {
    if(this.authService.getDecodedToken()){
      if(this.authService.getDecodedToken().role.includes('admin')){
        this.router.navigate(['/dashboard/admin'])
      }else{
        this.router.navigate(['/dashboard'])
      }
    }
    // const userData = await firstValueFrom(this.authService.getUserDetails());
    // if (userData) {
    //   let routeToHit = '/'
    //   if (userData?.isAdmin) {
    //     routeToHit = '/subscriptions';
    //   }
    //   this.router.navigate([routeToHit])
    // }
  }
  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router, public toastr: ToastrService, private loggingService: LoggingService, private themeService: ThemeService) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
  onSubmit() {
    if (this.loginForm.valid) {
      this.loading = true;
      this.authService.login(this.loginForm.value).subscribe({
        next: (response: any) => {
          this.loading = false;
          
          if (response.requiresVerification) {
            // Store login data for OTP verification
            this.authService.setLoginData(this.loginForm.value);
            this.toastr.success(response.message);
            this.router.navigate(['/otp']);
          } else {
            // If device is already verified, proceed with normal login
            this.authService.storeTokens(response.data.tokens);
            this.toastr.success(response.message);
            
            const decodedToken = this.authService.getDecodedToken();
            let routeToHit = '/dashboard';
            // if (decodedToken?.role?.includes('admin')) {
            //   routeToHit = '/dashboard/admin';
            // }
            this.router.navigate([routeToHit]);
          }
        },
        error: (error: any) => {
          this.loading = false;
          if (error.error?.status === 403 && error.error?.data?.isBanned) {
            this.banDetails = {
              reason: error.error.data.banReason,
              bannedAt: new Date(error.error.data.bannedAt)
            };
            this.showBanModal = true;
          } else {
            const errorMessage = error.error ? error.error.message : "Something went wrong while logging in";
            this.toastr.error(errorMessage);
          }
        }
      });
    } else {
      this.toastr.error('Invalid Inputs!');
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  closeBanModal() {
    this.showBanModal = false;
    this.banDetails = null;
  }

  loginWithGoogle(): void {
    this.authService.initiateGoogleAuth();
  }
}

