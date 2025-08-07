import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/shared/service/Auth/Auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-otp-org-registration',
  templateUrl: './otp-org-registration.component.html',
  styleUrls: ['./otp-org-registration.component.scss']
})
export class OtpOrgRegistrationComponent implements OnInit {
  otpForm: FormGroup;
  loading = false;
  email: string = '';
  backendUrl = environment.BACKEND_URL;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastr: ToastrService,
    private authService: AuthService,
    private http: HttpClient
  ) {
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  ngOnInit() {
    // Get email from AuthService loginData
    this.authService.getLoginData().subscribe(data => {
      if (data?.email) {
        this.email = data.email;
      } else {
        this.router.navigate(['/sign-up']);
      }
    });
  }

  onSubmit(): void {
    if (this.otpForm.valid) {
      this.loading = true;
      const otp = this.otpForm.value.otp;
      this.http.post(`${this.backendUrl}/api/auth/org-registration/verify-otp`, { email: this.email, otp }).subscribe({
        next: (response: any) => {
          this.loading = false;
          this.toastr.success(response.message);
          this.router.navigate(['/org-registration']);
        },
        error: (error) => {
          this.loading = false;
          this.toastr.error(error.error?.message || 'Invalid OTP');
        }
      });
    } else {
      this.toastr.error('Please enter a valid 6-digit OTP code.');
    }
  }

  resendOtp() {
    this.loading = true;
    this.http.post(`${this.backendUrl}/api/auth/org-registration/send-otp`, { email: this.email }).subscribe({
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