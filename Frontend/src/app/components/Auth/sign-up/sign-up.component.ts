import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/shared/service/Auth/Auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ThemeService } from 'src/app/shared/service/theme.service';
import { CorporationService } from 'src/app/shared/service/corporation/corporation.service';
import { RecaptchaComponent } from 'ng-recaptcha';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.scss'
})
export class SignUpComponent implements OnInit {
  @ViewChild('recaptcha') recaptchaComponent!: RecaptchaComponent;
  signUpForm!: FormGroup;
  loading = false;
  showPassword = false;
  showConfirmPassword = false;
  orgSearchLoading = false;
  currentTheme$ = this.themeService.currentTheme$;
  recaptchaSiteKey = environment.RECAPTCHA_SITE_KEY;

  constructor(
    private fb: FormBuilder, 
    private authService: AuthService,
    private corporationService: CorporationService, 
    private router: Router, 
    public toastr: ToastrService, 
    private themeService: ThemeService,
    private http: HttpClient
  ) {
    this.signUpForm = this.createForm();
  }

  ngOnInit(): void {
    // Check if user is already logged in
    if (this.authService.getDecodedToken()) {
      if (this.authService.getDecodedToken().role.includes('admin')) {
        this.router.navigate(['/dashboard/admin']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    }
  }

  createForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      phone: ['', Validators.required],
      agreement: [false, Validators.requiredTrue],
      recaptcha: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    
    return null;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onOrgSearch(): void {
    if (this.orgSearchLoading) return;
    
    const orgNumber = this.signUpForm.get('organization_number')?.value;
    if (!orgNumber) {
      this.toastr.error('Please enter an organization number');
      return;
    }
    
    this.orgSearchLoading = true;
    this.corporationService.publicSearchOrganization(orgNumber).subscribe({
      next: (response) => {
        if (response.success) {
          const orgFields = [
            'corp_name',
            'street_address',
            'registered_city',
            'postal_code',
            'city',
            'company_email',
            'company_phone'
          ];

          // Re-enable all org fields before autofill (in case user searches again)
          orgFields.forEach(field => this.signUpForm.get(field)?.enable());

          // Only patch and disable fields that have a value
          const orgData: any = response.data;
          orgFields.forEach(field => {
            const value = orgData[field];
            if (value && value.trim() !== '') {
              this.signUpForm.get(field)?.patchValue(value);
              this.signUpForm.get(field)?.disable();
            } else {
              this.signUpForm.get(field)?.patchValue(''); // Clear if empty
              this.signUpForm.get(field)?.enable();
            }
          });

          // Do NOT autofill or disable admin fields (first_name, last_name, email, etc.)

          this.toastr.success('Organization found');
        } else {
          this.toastr.error('Organization not found');
        }
        this.orgSearchLoading = false;
      },
      error: (error) => {
        this.toastr.error(error.error?.message || 'Failed to search organization');
        this.orgSearchLoading = false;
      }
    });
  }

  onCaptchaResolved(token: string | null): void {
    if (token) {
      this.signUpForm.get('recaptcha')?.setValue(token);
    }
  }

  onSubmit(): void {
    if (this.signUpForm.valid) {
      this.loading = true;
      const userData = this.signUpForm.getRawValue();
      this.authService.setLoginData(userData);
      // Call backend to send OTP for org registration
      this.http.post(`${environment.BACKEND_URL}/api/auth/org-registration/send-otp`, { email: userData.email }).subscribe({
        next: (response: any) => {
          this.loading = false;
          this.router.navigate(['/otp-org-registration']);
        },
        error: (error) => {
          this.loading = false;
          this.toastr.error(error.error?.message || 'Failed to send OTP');
        }
      });
    } else {
      Object.keys(this.signUpForm.controls).forEach(key => {
        const control = this.signUpForm.get(key);
        control?.markAsTouched();
      });
      this.toastr.error('Please fix validation errors before submitting.');
    }
  }
}

