import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SwishService, CustomerSearchResponse, SwishPaymentRequest } from 'src/app/shared/service/swish/swish.service';
import { SelectOption } from 'src/app/shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-swish-add',
  templateUrl: './swish-add.component.html',
  styleUrls: ['./swish-add.component.scss']
})
export class SwishAddComponent implements OnInit {
  paymentForm: FormGroup;
  isSubmitting = false;
  categories: SelectOption[] = [
    { value: 'Private', label: 'Private' },
    { value: 'Company', label: 'Company' },
    { value: 'Business', label: 'Business' },
    { value: 'Agency', label: 'Agency' },
    { value: 'Client', label: 'Client' }
  ];

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private swishService: SwishService,
    private router: Router
  ) {
    this.paymentForm = this.fb.group({
      reference: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      category: ['', Validators.required],
      amounts: this.fb.array([]),
      socialSecurityNumber: ['', [Validators.required, Validators.pattern(/^\d{6,12}$/)]],
      telephoneNumber: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-()]{7,15}$/)]],
      email: ['', [
        Validators.required, 
        Validators.maxLength(100),
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ]],
      description: ['', [Validators.maxLength(500)]],
      address: ['', [Validators.maxLength(200)]]
    });

    // Add a default amount row
    this.addAmount();
  }

  ngOnInit(): void {}

  get amountsArray(): FormArray {
    return this.paymentForm.get('amounts') as FormArray;
  }

  createAmountGroup(amount: number = 0, description: string = ''): FormGroup {
    return this.fb.group({
      amount: [amount, [Validators.required, Validators.min(0)]],
      description: [description]
    });
  }

  addAmount() {
    this.amountsArray.push(this.createAmountGroup());
  }

  removeAmount(index: number) {
    this.amountsArray.removeAt(index);
  }

  calculateTotalAmount(): number {
    return this.amountsArray.controls.reduce((sum, control) => {
      const amount = control.get('amount')?.value || 0;
      return sum + Number(amount);
    }, 0);
  }

  onSubmit() {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      console.log(this.paymentForm.get('name')?.value)
      this.toastr.error('Please fill in all required fields');
      return;
    }

    this.isSubmitting = true;
    
    // Prepare payment data
    const paymentData: SwishPaymentRequest = {
      reference: this.paymentForm.get('reference')?.value,
      name: this.paymentForm.get('name')?.value,
      category: this.paymentForm.get('category')?.value,
      amounts: this.amountsArray.controls.map(control => ({
        amount: control.get('amount')?.value,
        description: control.get('description')?.value
      })),
      socialSecurityNumber: this.paymentForm.get('socialSecurityNumber')?.value,
      telephoneNumber: this.paymentForm.get('telephoneNumber')?.value,
      email: this.paymentForm.get('email')?.value,
      address: this.paymentForm.get('address')?.value,
      description: this.paymentForm.get('description')?.value
    };

    // Call Swish service to create payment
    this.swishService.createSwishPayment(paymentData).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success(response.message || 'Payment registered successfully');
          // Reset form or navigate
          this.paymentForm.reset();
          this.amountsArray.clear(); // Clear dynamic amounts
          this.router.navigate(['/dashboard/swish']);
        } else {
          this.toastr.warning(response.message || 'Failed to register payment');
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        this.toastr.error(error.error?.message || 'Error registering payment');
        this.isSubmitting = false;
      }
    });
  }

  getCustomerInfo() {
    return {
      customer: this.paymentForm.get('name')?.value || '',
      socialSecurityNumber: this.paymentForm.get('socialSecurityNumber')?.value || '',
      telephone: this.paymentForm.get('telephoneNumber')?.value || '',
      email: this.paymentForm.get('email')?.value || '',
      address: this.paymentForm.get('address')?.value || '',
      category: this.paymentForm.get('category')?.value || ''
    };
  }

  getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Validation helpers for template
  isFieldInvalid(field: string): boolean {
    const control = this.paymentForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getFieldError(field: string): string | null {
    const control = this.paymentForm.get(field);
    if (!control || !control.errors) return null;
    
    if (control.errors['required']) return 'This field is required.';
    
    if (field === 'email') {
      if (control.errors['maxlength']) return 'Email cannot exceed 100 characters.';
      if (control.errors['pattern']) return 'Invalid email format. Use a valid email address.';
    }
    
    if (control.errors['minlength']) return `Minimum length is ${control.errors['minlength'].requiredLength} characters.`;
    if (control.errors['maxlength']) return `Maximum length is ${control.errors['maxlength'].requiredLength} characters.`;
    
    return 'Invalid value.';
  }

  isAmountFieldInvalid(index: number, field: string): boolean {
    const control = (this.amountsArray.at(index) as FormGroup).get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getAmountFieldError(index: number, field: string): string | null {
    const control = (this.amountsArray.at(index) as FormGroup).get(field);
    if (!control || !control.errors) return null;
    if (control.errors['required']) return 'This field is required.';
    if (control.errors['min']) return 'Amount must be at least 0.';
    if (control.errors['maxlength']) return `Maximum length is ${control.errors['maxlength'].requiredLength} characters.`;
    return 'Invalid value.';
  }

  formatAmountNumber(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const formattedValue = value.replace(/[^0-9.]/g, '');
    input.value = formattedValue;
    
    // Safely update the form control value
    const amountControl = this.amountsArray.at(index)?.get('amount');
    if (amountControl) {
      amountControl.setValue(formattedValue);
    }
  }
}
