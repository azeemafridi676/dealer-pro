import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/shared/service/Auth/Auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CorporationService } from 'src/app/shared/service/corporation/corporation.service';

@Component({
  selector: 'app-org-registration',
  templateUrl: './org-registration.component.html',
  styleUrls: ['./org-registration.component.scss']
})
export class OrgRegistrationComponent implements OnInit {
  orgForm!: FormGroup;
  loading = false;
  orgSearchLoading = false;
  orgSearchSuccess = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private corporationService: CorporationService
  ) {
    this.orgForm = this.fb.group({
      organization_number: ['', Validators.required],
      corp_name: ['', Validators.required],
      street_address: ['', Validators.required],
      registered_city: ['', Validators.required],
      postal_code: ['', Validators.required],
      city: ['', Validators.required],
      company_email: ['', [Validators.required, Validators.email]],
      company_phone: ['', Validators.required]
    });
    // Reset orgSearchSuccess if organization_number changes
    this.orgForm.get('organization_number')?.valueChanges.subscribe(() => {
      this.orgSearchSuccess = false;
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (!this.orgSearchSuccess) {
      this.orgForm.get('organization_number')?.setErrors({ orgSearch: true });
      this.toastr.error('Please search and select a valid organization.');
      return;
    }
    if (this.orgForm.valid) {
      this.loading = true;
      const orgData = this.orgForm.getRawValue();
      this.authService.setOrgRegistrationData(orgData);
      this.authService.completeSignUp().subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success && response.data.tokens) {
            this.authService.storeTokens(response.data.tokens);
            this.toastr.success('Account created successfully!');
            this.router.navigate(['/dashboard']);
          } else {
            this.toastr.error('Something went wrong during registration');
          }
        },
        error: (error) => {
          this.loading = false;
          const errorMessage = error.error?.message || 'Something went wrong while registering';
          this.toastr.error(errorMessage);
        }
      });
    } else {
      Object.keys(this.orgForm.controls).forEach(key => {
        const control = this.orgForm.get(key);
        control?.markAsTouched();
      });
      this.toastr.error('Please fill all required organization fields.');
    }
  }

  onOrgSearch(): void {
    if (this.orgSearchLoading) return;
    const orgNumber = this.orgForm.get('organization_number')?.value;
    if (!orgNumber) {
      this.toastr.error('Please enter an organization number');
      this.orgSearchSuccess = false;
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
          // Re-enable all org fields before autofill
          orgFields.forEach(field => this.orgForm.get(field)?.enable());
          // Only patch and disable fields that have a value
          const orgData: any = response.data;
          orgFields.forEach(field => {
            const value = orgData[field];
            if (value && value.trim() !== '') {
              this.orgForm.get(field)?.patchValue(value);
              this.orgForm.get(field)?.disable();
            } else {
              this.orgForm.get(field)?.patchValue('');
              this.orgForm.get(field)?.enable();
            }
          });
          this.toastr.success('Organization found');
          this.orgSearchSuccess = true;
        } else {
          this.toastr.error('Organization not found');
          this.orgSearchSuccess = false;
        }
        this.orgSearchLoading = false;
      },
      error: (error) => {
        this.toastr.error(error.error?.message || 'Failed to search organization');
        this.orgSearchSuccess = false;
        this.orgSearchLoading = false;
      }
    });
  }
} 