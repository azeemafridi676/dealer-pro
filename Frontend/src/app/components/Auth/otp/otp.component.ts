// otp.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/shared/service/Auth/Auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ThemeService } from 'src/app/shared/service/theme.service';

@Component({
  selector: 'app-otp',
  templateUrl: './otp.component.html',
  styleUrls: ['./otp.component.scss']
})
export class OtpComponent implements OnInit {
  otpForm: FormGroup;
  loading = false;
  email: string = '';
  currentTheme$ = this.themeService.currentTheme$;

  constructor(
    private fb: FormBuilder, 
    private authService: AuthService, 
    private router: Router, 
    private toastr: ToastrService,
    private themeService: ThemeService
  ) {
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  ngOnInit() {
    // Get email from login data
    this.authService.getLoginData().subscribe(data => {
      if (data?.email) {
        this.email = data.email;
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  onSubmit(): void {
    if (this.otpForm.valid) {
      this.loading = true;
      const otpData = this.otpForm.value;
      this.authService.verifyOtp(otpData.otp).subscribe({
        next: (response) => {
          this.loading = false;
          this.toastr.success(response.message);
          // Store tokens
          this.authService.storeTokens(response.data.tokens);
          // Redirect to admin dashboard
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.loading = false;
          this.toastr.error(error.error?.message || 'Invalid OTP');
        }
      });
    } else {
      this.toastr.error("Please enter a valid 6-digit OTP code.");
    }
  }

  resendOtp() {
    this.loading = true;
    this.authService.resendOtpCode().subscribe({
      next: (response: any) => {
        this.loading = false;
        this.toastr.success(response.message);
      },
      error: (error: any) => {
        this.loading = false;
        this.toastr.error(error.error?.message || 'Failed to resend OTP');
      }
    });
  }
}
