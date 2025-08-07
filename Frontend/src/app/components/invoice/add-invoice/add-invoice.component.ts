import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators, ReactiveFormsModule, FormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { CorporationService } from 'src/app/shared/service/corporation/corporation.service';
import { SwishService, CustomerSearchResponse } from 'src/app/shared/service/swish/swish.service';
import { AuthService, UserDetails } from 'src/app/shared/service/Auth/Auth.service';
import { InvoiceService, InvoiceData } from 'src/app/shared/service/invoice/invoice.service';
import { CustomerService } from 'src/app/shared/service/customer/customer.service';

@Component({
  selector: 'app-add-invoice',
  templateUrl: './add-invoice.component.html',
  styleUrls: ['./add-invoice.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule
  ]
})
export class AddInvoiceComponent implements OnInit {
  invoiceForm: FormGroup;
  vatRates = [
    { value: 0, label: '0%' },
    { value: 0.25, label: '25%' }
  ];

  companyDetails: any = {
    name: 'Company Name Ltd',
    orgNumber: '123456-7890',
    email: 'info@company.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main Street, City, Zip Code',
    bankgiro: '123-4567',
    vatNumber: 'US123456789001'
  };

  invoiceDetails: any = {
    invoiceNumber: 3,
    language: 'English',
    currency: 'SEK'
  };

  orgSearchLoading = false;
  customerSearchLoading = false;

  private selectedCustomerId: string = '';
  private selectedOrganizationId: string = '';

  saveLoading = false;

  // New: Track if customer/org have been searched and are valid
  customerSearched = false;
  organizationSearched = false;

  personSearchLoading = false;
  personSearched = false;
  personData: any = null;

  // Add new properties
  customerTypeExists = true;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private corporationService: CorporationService,
    private swishService: SwishService,
    private toastr: ToastrService,
    private authService: AuthService,
    private customerService: CustomerService,
    @Inject(InvoiceService) private invoiceService: InvoiceService
  ) {
    this.invoiceForm = this.fb.group({
      customerType: ['', [
        Validators.required, 
        this.customerTypeValidator.bind(this)
      ]],
      
      // Company-specific fields
      organizationNumber: ['', [
        Validators.pattern(/^\d{6}-\d{4}$/)
      ]],
      companyName: ['', [
        Validators.required, 
        Validators.minLength(2),
        Validators.maxLength(100),
        this.noWhitespaceValidator
      ]],
      businessCategory: [''],
      legalForm: [''],
      
      // Private Individual-specific fields
      customerNumber: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20)
      ]],
      customerName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100)
      ]],
      
      // Existing fields
      receiptDate: ['', [
        Validators.required, 
        this.futureDateValidator,
        this.maxDateValidator(new Date(new Date().getFullYear() + 1, 11, 31)) // Max date: end of next year
      ]],
      dueDate: ['', [
        Validators.required, 
        this.dueDateValidator,
        this.maxDateValidator(new Date(new Date().getFullYear() + 1, 11, 31)) // Max date: end of next year
      ]],
      isReference: [''],
      contactPerson: ['', [Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [
        Validators.required, 
        Validators.email,
        Validators.maxLength(100),
        this.emailValidator
      ]],
      telephoneNumber: ['', [
        Validators.required,
        Validators.pattern(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/),
        this.telephoneValidator
      ]],
      
      // Existing fields
      businessDescription: ['', [Validators.maxLength(500)]],
      vatNumber: ['', [Validators.pattern(/^(SE)?[0-9]{12}$/)]],
      website: ['', [Validators.pattern(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/)]],
      
      invoiceItems: this.fb.array([], [Validators.required, this.atLeastOneProductValidator])
    }, { validators: this.crossFieldValidator });

    this.setupFormValueChanges();

    this.invoiceForm.get('customerType')?.valueChanges.subscribe(type => {
      const orgNumberControl = this.invoiceForm.get('organizationNumber');
      const customerNumberControl = this.invoiceForm.get('customerNumber');
      const companyNameControl = this.invoiceForm.get('companyName');
      const customerNameControl = this.invoiceForm.get('customerName');
      const businessCategoryControl = this.invoiceForm.get('businessCategory');
      const legalFormControl = this.invoiceForm.get('legalForm');
      
      // Reset all fields first
      [orgNumberControl, customerNumberControl, companyNameControl, 
       customerNameControl, businessCategoryControl, legalFormControl].forEach(control => {
        control?.clearValidators();
        control?.updateValueAndValidity();
        control?.setValue('');
      });

      // Set specific validations based on customer type
      if (type === 'Company') {
        orgNumberControl?.setValidators([
          Validators.required,
          Validators.pattern(/^\d{6}-\d{4}$/)
        ]);
        companyNameControl?.setValidators([
          Validators.required, 
          Validators.minLength(2),
          Validators.maxLength(100),
          this.noWhitespaceValidator
        ]);
        businessCategoryControl?.setValidators([Validators.required]);
        legalFormControl?.setValidators([Validators.required]);
      } else if (type === 'Private Individual') {
        customerNumberControl?.setValidators([
          Validators.required,
          Validators.minLength(3)
        ]);
        customerNameControl?.setValidators([
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100)
        ]);
      }

      // Update validity of all controls
      [orgNumberControl, customerNumberControl, companyNameControl, 
       customerNameControl, businessCategoryControl, legalFormControl].forEach(control => {
        control?.updateValueAndValidity();
      });

      // Reset customer search state
      this.customerSearched = false;
      this.selectedCustomerId = '';

      // Check customer type existence
      this.checkCustomerTypeExistence(type);

      // Reset customer type existence flag when type changes
      this.customerTypeExists = true;
    });
  }

  ngOnInit(): void {
    this.addInvoiceItem();
    
    // Fetch user details to populate company information
    this.authService.getUserProfileData().subscribe({
      next: (userDetails: UserDetails) => {
        if (userDetails) {
            console.log("userDetails", userDetails)
          // Prioritize organization details if available
          if (userDetails.organization) {
            this.companyDetails = {
              name: userDetails.organization.organization_name || userDetails.corp.corp_name,
              orgNumber: userDetails.organization.organization_number || userDetails.corp.corp_id,
              email: userDetails.organization.organization_email || '-',
              phone: userDetails.organization.organization_phone || '-',
              address: this.companyDetails.address || '-',
              bankgiro: this.companyDetails.bankgiro || '-',
              vatNumber: this.companyDetails.vatNumber || '-'
            };
          } else if (userDetails.corp) {
            // Fallback to corp details if no organization details
            this.companyDetails = {
              name: userDetails.corp.corp_name,
              orgNumber: userDetails.corp.corp_id,
              email: '-',
              phone: '-',
              address: this.companyDetails.address || '-',
              bankgiro: this.companyDetails.bankgiro || '-',
              vatNumber: this.companyDetails.vatNumber || '-'
            };
          }
        }
      },
      error: (error) => {
        console.error('Failed to fetch user profile', error);
        this.toastr.error('Could not load company details');
      }
    });

    // Check customer type existence when a type is already selected
    const currentCustomerType = this.invoiceForm.get('customerType')?.value;
    if (currentCustomerType) {
      this.checkCustomerTypeExistence(currentCustomerType);
    }
  }

  setupFormValueChanges(): void {
    // Listen to changes in main form fields
    const fieldsToWatch = [
      'customerType', 
      'organizationNumber', 
      'receiptDate', 
      'dueDate', 
      'isReference', 
      'contactPerson', 
      'email', 
      'telephoneNumber'
    ];

    fieldsToWatch.forEach(field => {
      this.invoiceForm.get(field)?.valueChanges.subscribe(() => {
        // Trigger change detection for preview
        this.invoiceForm.updateValueAndValidity();
      });
    });
  }

  get invoiceItems(): FormArray {
    return this.invoiceForm.get('invoiceItems') as FormArray;
  }

  createInvoiceItemForm(): FormGroup {
    const itemForm = this.fb.group({
      product: ['', [Validators.required, Validators.minLength(2)]],
      number: [1, [
        Validators.required, 
        Validators.min(1), 
        Validators.max(1000)
      ]],
      unit: ['st'],
      priceExclVAT: [0, [
        Validators.required, 
        Validators.min(0.01),  // Price must be greater than 0
        Validators.max(1000000)  // Reasonable upper limit
      ]],
      vatRate: [0.25, Validators.required],
      amount: [0]
    });

    // Update amount when price or number changes
    itemForm.get('priceExclVAT')?.valueChanges.subscribe(() => this.calculateItemAmount(itemForm));
    itemForm.get('number')?.valueChanges.subscribe(() => this.calculateItemAmount(itemForm));
    itemForm.get('vatRate')?.valueChanges.subscribe(() => this.calculateItemAmount(itemForm));

    return itemForm;
  }

  addInvoiceItem(): void {
    this.invoiceItems.push(this.createInvoiceItemForm());
  }

  addProductLine(): void {
    const newItemForm = this.createInvoiceItemForm();
    newItemForm.get('product')?.setValue('');
    this.invoiceItems.push(newItemForm);
  }

  removeInvoiceItem(index: number): void {
    // Prevent removing the last item
    if (this.invoiceItems.length > 1) {
      this.invoiceItems.removeAt(index);
    }
  }

  calculateItemAmount(itemForm: FormGroup): void {
    const priceExclVAT = itemForm.get('priceExclVAT')?.value || 0;
    const number = itemForm.get('number')?.value || 1;
    const vatRate = itemForm.get('vatRate')?.value || 0.25;
    
    const amount = priceExclVAT * number;
    itemForm.get('amount')?.setValue(amount, { emitEvent: false });
    
    // Trigger change detection for preview
    this.invoiceForm.updateValueAndValidity();
  }

  calculateTotals(): { net: number, vat: number, total: number } {
    let net = 0;
    let vat = 0;

    this.invoiceItems.controls.forEach(itemForm => {
      const priceExclVAT = itemForm.get('priceExclVAT')?.value || 0;
      const number = itemForm.get('number')?.value || 1;
      const vatRate = itemForm.get('vatRate')?.value || 0;

      const itemNet = priceExclVAT * number;
      net += itemNet;
      vat += itemNet * vatRate;
    });

    return {
      net: net,
      vat: vat,
      total: net + vat
    };
  }

  onSubmit(): void {
    // Mark all form controls as touched to trigger validation display
    this.markFormGroupTouched(this.invoiceForm);
    
    // Check customer type specific validations
    const customerType = this.invoiceForm.get('customerType')?.value;
    
    // Validation checks
    const validationErrors: string[] = [];
    
    // Customer type validation
    if (!customerType) {
      validationErrors.push('Customer type must be selected');
    }
    
    // Customer search validation based on customer type
    if (customerType === 'Company') {
      if (!this.organizationSearched) {
        validationErrors.push('Organization must be searched and validated');
      }
    } else if (customerType === 'Private Individual') {
      if (!this.personSearched) {
        validationErrors.push('Person details must be searched and validated');
      }
    }
    
    // If there are validation errors, show them and prevent submission
    if (validationErrors.length > 0) {
      // Show each error as a separate toast
      validationErrors.forEach(error => {
        this.toastr.error(error);
      });
      return;
    }
    
    // Proceed with form submission if all validations pass
    if (this.invoiceForm.valid) {
      this.saveLoading = true;
      // Generate a receipt number (you might want to use a more sophisticated method)
      const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;

      // Prepare invoice data for submission
      const invoiceData: InvoiceData = {
        receiptNumber: receiptNumber,
        customerType: this.invoiceForm.get('customerType')?.value,
        
        // Conditional fields based on customer type
        ...(this.invoiceForm.get('customerType')?.value === 'Company' ? {
          organizationNumber: this.invoiceForm.get('organizationNumber')?.value,
          companyName: this.invoiceForm.get('companyName')?.value,
          businessCategory: this.invoiceForm.get('businessCategory')?.value,
          legalForm: this.invoiceForm.get('legalForm')?.value,
        } : {
          customerNumber: this.invoiceForm.get('customerNumber')?.value,
          customerName: this.invoiceForm.get('customerName')?.value,
        }),
        
        receiptDate: this.invoiceForm.get('receiptDate')?.value,
        dueDate: this.invoiceForm.get('dueDate')?.value,
        contactPerson: this.invoiceForm.get('contactPerson')?.value,
        
        // Ensure email and telephone are not empty
        email: this.invoiceForm.get('email')?.value || 'default@example.com',
        telephoneNumber: this.invoiceForm.get('telephoneNumber')?.value || '+46000000000',
        
        // Optional organization details
        businessDescription: this.invoiceForm.get('businessDescription')?.value,
        vatNumber: this.invoiceForm.get('vatNumber')?.value,
        website: this.invoiceForm.get('website')?.value,

        // Invoice items
        invoiceItems: this.invoiceItems.controls.map(item => ({
          product: item.get('product')?.value,
          number: item.get('number')?.value,
          unit: item.get('unit')?.value,
          priceExclVAT: item.get('priceExclVAT')?.value,
          vatRate: item.get('vatRate')?.value,
          amount: item.get('amount')?.value
        })),

        // Calculated totals
        subtotal: this.calculateTotals().net,
        moms: this.calculateTotals().vat,
        totally: this.calculateTotals().total,

        // Additional details
        language: this.invoiceDetails.language as 'English' | 'Swedish' | 'Other',
        currency: this.invoiceDetails.currency as 'SEK' | 'USD' | 'EUR',

        // Add customer and organization references
        customer: this.selectedCustomerId,
        organization: this.selectedOrganizationId,

        // Optional reference flag
        isReference: this.invoiceForm.get('isReference')?.value || false
      };

      // Submit invoice
      this.invoiceService.createInvoice(invoiceData).subscribe({
        next: (response) => {
          this.saveLoading = false;
          this.toastr.success('Invoice created successfully');
          this.router.navigate(['/dashboard/invoices']);
        },
        error: (error) => {
          this.saveLoading = false;
          console.error('Invoice creation error:', error);
          this.toastr.error(error.error?.message || 'Failed to create invoice');
        }
      });
    } else {
      // Log form validation errors
      console.error('Form validation errors:', {
        formErrors: this.invoiceForm.errors,
        customerType: this.invoiceForm.get('customerType')?.errors,
        ...(this.invoiceForm.get('customerType')?.value === 'Company' ? {
          organizationNumber: this.invoiceForm.get('organizationNumber')?.errors,
          companyName: this.invoiceForm.get('companyName')?.errors,
          businessCategory: this.invoiceForm.get('businessCategory')?.errors,
          legalForm: this.invoiceForm.get('legalForm')?.errors,
        } : {
          customerNumber: this.invoiceForm.get('customerNumber')?.errors,
          customerName: this.invoiceForm.get('customerName')?.errors,
        }),
        receiptDate: this.invoiceForm.get('receiptDate')?.errors,
        dueDate: this.invoiceForm.get('dueDate')?.errors,
        email: this.invoiceForm.get('email')?.errors,
        telephoneNumber: this.invoiceForm.get('telephoneNumber')?.errors,
        invoiceItems: this.invoiceForm.get('invoiceItems')?.errors
      });
      this.toastr.error('Please fill in all required fields correctly');
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/invoices']);
  }

  getFormControl(item: any, controlName: string): FormControl {
    const control = item.get(controlName);
    if (!control) {
      throw new Error(`Control ${controlName} not found`);
    }
    return control as FormControl;
  }

  // New method for organization search
  onOrgSearch(): void {
    const organizationNumber = this.invoiceForm.get('organizationNumber')?.value;
    if (!organizationNumber || organizationNumber.trim() === '') {
      this.toastr.error('Please enter a valid organization number');
      this.organizationSearched = false;
      return;
    }
    this.orgSearchLoading = true;
    this.corporationService.publicSearchOrganization(organizationNumber).subscribe({
      next: (response) => {
        this.orgSearchLoading = false;
        if (response.success && response.data) {
          const orgData:any = response.data;
          
          // Set the organization ID (use organization_number as fallback)
          this.selectedOrganizationId = orgData._id || orgData.organization_number || '';

          // Populate form fields with retrieved data
          this.invoiceForm.patchValue({
            // Explicitly set company name from corp_name
            companyName: orgData.corp_name || '',
            email: orgData.company_email || '',
            telephoneNumber: orgData.company_phone.number || '',
            contactPerson: orgData.contact_person || '',
            
            // New fields
            businessDescription: orgData.business_description || '',
            businessCategory: orgData.business_category || '',
            legalForm: orgData.legal_form || '',
            vatNumber: orgData.vat_number || '',
            website: orgData.website || ''
          });

          // Update companyDetails with organization information
          this.companyDetails = {
            name: orgData.corp_name || '-',
            orgNumber: orgData.organization_number || '-',
            email: orgData.company_email || '-',
            phone: orgData.company_phone.number || '-',
            address: orgData.street_address || '-',
            bankgiro: '', // Not typically part of org search response
            vatNumber: orgData.vat_number || '-'
          };

          this.organizationSearched = true;
          this.toastr.success('Organization details retrieved successfully');
        } else {
          this.organizationSearched = false;
          this.toastr.error('Organization not found');
        }
      },
      error: (error) => {
        this.orgSearchLoading = false;
        this.organizationSearched = false;
        this.toastr.error(error.error?.message || 'Failed to search organization');
      }
    });
  }

  // New method to normalize customer type
  private normalizeCustomerType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'Private': 'Private Individual',
      'Private Individual': 'Private',
      'Company': 'Company',
      'Business': 'Company'
    };
    return typeMap[type] || type;
  }

  // Update search method for private individuals
  searchPerson(): void {
    const customerNumber = this.invoiceForm.get('customerNumber')?.value;
    const customerType = this.invoiceForm.get('customerType')?.value;

    if (!customerNumber) {
      this.toastr.error('Please enter a customer number');
      return;
    }

    if (!customerType) {
      this.toastr.error('Please select a customer type first');
      return;
    }

    this.personSearchLoading = true;
    this.personSearched = false;
    this.personData = null;

    // Use customer service to search by customer number
    this.customerService.searchCustomerByNumber(customerNumber, customerType).subscribe({
      next: (response: { success: boolean, data?: any, message?: string }) => {
        this.personSearchLoading = false;
        if (response.success && response.data) {
          const customerData = response.data;
          
          // Store the full customer data
          this.personData = customerData;

          // Patch form with extracted information
          this.invoiceForm.patchValue({
            customerName: customerData.name || '',
            email: customerData.email || '',
            telephoneNumber: customerData.telephone || '',
            contactPerson: customerData.name || ''
          });

          this.personSearched = true;
          this.selectedCustomerId = customerData.customer_id;
          this.toastr.success('Customer found successfully');
        } else {
          this.toastr.error(response.message || 'Customer not found');
        }
      },
      error: (error: { error?: { message?: string }, message?: string }) => {
        this.personSearchLoading = false;
        this.personSearched = false;
        console.error('Customer search error:', error);
        this.toastr.error(error.error?.message || error.message || 'Failed to search customer');
      }
    });
  }

  // Method to check customer type existence
  private checkCustomerTypeExistence(type: string): void {
    // Normalize type to match backend expectations
    const normalizedType = type === 'Private' ? 'Private Individual' : type;
    
    this.customerService.checkCustomerTypeExists(normalizedType).subscribe({
      next: (response) => {
        // Update customer type existence flag
        this.customerTypeExists = response.hasCustomers;
        
        // If no customers exist, add custom validator
        if (!response.hasCustomers) {
          const customerTypeControl = this.invoiceForm.get('customerType');
          customerTypeControl?.setErrors({
            ...customerTypeControl.errors,
            noCustomersOfType: true
          });
        }
      },
      error: (error) => {
        console.error('Error checking customer type existence:', error);
        this.customerTypeExists = true; // Default to true on error
      }
    });
  }

  // Custom validator for customer type
  customerTypeValidator(control: AbstractControl): ValidationErrors | null {
    const customerType = control.value;
    const customerTypeExists = this.customerTypeExists;

    if (customerType && !customerTypeExists) {
      return { noCustomersOfType: true };
    }

    return null;
  }

  // Method to check customer type existence on input focus
  checkCustomerTypeExistenceOnFocus(): void {
    const customerType = this.invoiceForm.get('customerType')?.value;
    
    // Only check if a customer type is selected
    if (!customerType) {
      this.toastr.warning('Please select a customer type first');
      return;
    }

    // Normalize type to match backend expectations
    const normalizedType = this.normalizeCustomerType(customerType);
    
    this.customerService.checkCustomerTypeExists(normalizedType).subscribe({
      next: (response) => {
        // Update customer type existence flag
        this.customerTypeExists = response.hasCustomers;
        
        // If no customers exist, show warning
        if (!response.hasCustomers) {
          this.toastr.warning(`No ${customerType} type customers found. Please create a customer first.`);
        }
      },
      error: (error) => {
        console.error('Error checking customer type existence:', error);
        this.customerTypeExists = true; // Default to true on error
      }
    });
  }

  // Method to navigate to customer creation
  navigateToCreateCustomer(): void {
    const customerType = this.invoiceForm.get('customerType')?.value;
    const normalizedType = this.normalizeCustomerType(customerType);

    this.router.navigate(['/dashboard/customers'], { 
      queryParams: { 
        createCustomer: 'true', 
        customerType: normalizedType 
      } 
    });
  }

  // Custom validators
  noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    const isWhitespace = (control.value || '').trim().length === 0;
    return !isWhitespace ? null : { 'whitespace': true };
  }

  futureDateValidator(control: AbstractControl): ValidationErrors | null {
    const selectedDate = new Date(control.value);
    const today = new Date();
    
    // Reset time components to compare only date
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    return selectedDate >= today ? null : { 'pastDate': true };
  }

  dueDateValidator(control: AbstractControl): ValidationErrors | null {
    const parentForm = control.parent;
    if (!parentForm) return null;

    const receiptDate = parentForm.get('receiptDate')?.value;
    const dueDate = control.value;

    if (!receiptDate || !dueDate) return null;

    const receiptDateObj = new Date(receiptDate);
    const dueDateObj = new Date(dueDate);

    return dueDateObj >= receiptDateObj ? null : { 'invalidDueDate': true };
  }

  atLeastOneProductValidator(control: AbstractControl): ValidationErrors | null {
    const invoiceItems = control as FormArray;
    const hasValidProduct = invoiceItems.controls.some(item => 
      item.get('product')?.value && 
      item.get('number')?.value > 0 && 
      item.get('priceExclVAT')?.value > 0
    );
    return hasValidProduct ? null : { 'noValidProduct': true };
  }

  crossFieldValidator(group: AbstractControl): ValidationErrors | null {
    const customerType = group.get('customerType')?.value;
    const organizationNumber = group.get('organizationNumber')?.value;
    
    // Additional cross-field validation logic can be added here
    return null;
  }

  // Additional custom validators
  emailValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!email) return null;
    
    return emailRegex.test(email) ? null : { 'invalidEmail': true };
  }

  telephoneValidator(control: AbstractControl): ValidationErrors | null {
    const phone = control.value;
    
    if (!phone) return null;
    
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/[^\d]/g, '');
    
    // Check if the cleaned phone number has a valid length
    return (cleanPhone.length >= 10 && cleanPhone.length <= 15) ? null : { 'invalidPhone': true };
  }

  maxDateValidator(maxDate: Date) {
    return (control: AbstractControl): ValidationErrors | null => {
      const selectedDate = new Date(control.value);
      
      if (!control.value) return null;
      
      return selectedDate <= maxDate ? null : { 'maxDateExceeded': true };
    };
  }

  private provideValidationErrorFeedback(): void {
    const errors: string[] = [];

    if (this.invoiceForm.get('customerNumber')?.invalid) {
      errors.push('Invalid customer number. Use 3-20 alphanumeric characters.');
    }
    if (this.invoiceForm.get('receiptDate')?.invalid) {
      const receiptDateErrors = this.invoiceForm.get('receiptDate')?.errors;
      if (receiptDateErrors?.['required']) errors.push('Invoice date is required.');
      if (receiptDateErrors?.['invalidDate']) errors.push('Invalid invoice date.');
      if (receiptDateErrors?.['pastDate']) errors.push('Invoice date must be today or in the future.');
      if (receiptDateErrors?.['maxDateExceeded']) errors.push('Invoice date cannot be more than a year in the future.');
    }
    if (this.invoiceForm.get('dueDate')?.invalid) {
      const dueDateErrors = this.invoiceForm.get('dueDate')?.errors;
      if (dueDateErrors?.['required']) errors.push('Due date is required.');
      if (dueDateErrors?.['invalidDueDate']) errors.push('Due date must be after or equal to invoice date.');
      if (dueDateErrors?.['maxDateExceeded']) errors.push('Due date cannot be more than a year in the future.');
      if (dueDateErrors?.['invalidDate']) errors.push('Invalid due date.');
    }
    if (this.invoiceForm.get('email')?.invalid) {
      errors.push('Invalid email address format.');
    }
    if (this.invoiceForm.get('telephoneNumber')?.invalid) {
      errors.push('Invalid telephone number. Use 10-15 digits.');
    }
    if (this.invoiceForm.get('invoiceItems')?.errors?.['noValidProduct']) {
      errors.push('At least one valid product is required. Each product must have a name, quantity > 0, and price > 0.');
    }
    if (errors.length > 0) {
      errors.forEach(error => this.toastr.error(error));
    } else {
      this.toastr.error('Please check the form for errors');
    }
  }

  // Add this method to the class
  formatNumber(event: Event, field: string) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const formattedValue = value.replace(/[^0-9.]/g, '');
    input.value = formattedValue;
  }
}
