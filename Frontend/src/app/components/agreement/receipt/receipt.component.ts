import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CorporationService } from '../../../shared/service/corporation/corporation.service';
import { SwishService } from '../../../shared/service/swish/swish.service';
import { AuthService, UserDetails } from '../../../shared/service/Auth/Auth.service';
import { InvoiceService, InvoiceData } from '../../../shared/service/invoice/invoice.service';
import { AgreementService } from '../../../shared/service/agreement/agreement.service';

@Component({
  selector: 'app-receipt',
  templateUrl: './receipt.component.html'
})
export class ReceiptComponent implements OnInit {
  invoiceForm: FormGroup;
  vatRates = [
    { value: 0.25, label: '25%' },
    { value: 0.12, label: '12%' },
    { value: 0.06, label: '6%' }
  ];

  companyDetails = {
    name: 'Company Name Ltd',
    orgNumber: '123456-7890',
    email: 'info@company.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main Street, City, Zip Code',
    bankgiro: '123-4567',
    vatNumber: 'US123456789001'
  };

  invoiceDetails = {
    invoiceNumber: 3,
    language: 'English',
    currency: 'SEK'
  };

  orgSearchLoading = false;
  customerSearchLoading = false;

  private selectedCustomerId: string = '';
  private selectedOrganizationId: string = '';

  // Stepper logic
  currentStep = 1;
  totalSteps = 3;
  submitting = false;
  submittingAndSigning = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private corporationService: CorporationService,
    private swishService: SwishService,
    private toastr: ToastrService,
    private authService: AuthService,
    @Inject(InvoiceService) private invoiceService: InvoiceService,
    private agreementService: AgreementService
  ) {
    this.invoiceForm = this.fb.group({
      customerNumber: ['', [
        Validators.required, 
        Validators.minLength(3),
        Validators.maxLength(100),
        Validators.pattern(/^[A-Za-z0-9\-_]+$/)
      ]],
      customerType: ['', [Validators.required]],
      organizationNumber: ['', [
        Validators.required, 
        Validators.pattern(/^\d{6}-\d{4}$/),
        this.noWhitespaceValidator
      ]],
      receiptDate: ['', [
        Validators.required, 
        this.futureDateValidator,
        this.maxDateValidator(new Date(new Date().getFullYear() + 1, 11, 31))
      ]],
      dueDate: ['', [
        Validators.required, 
        this.dueDateValidator,
        this.maxDateValidator(new Date(new Date().getFullYear() + 1, 11, 31))
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
      businessDescription: ['', [Validators.maxLength(500)]],
      businessCategory: [''],
      legalForm: [''],
      vatNumber: ['', [Validators.pattern(/^(SE)?[0-9]{12}$/)]],
      website: ['', [Validators.pattern(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/)]],
      invoiceItems: this.fb.array([], [Validators.required, this.atLeastOneProductValidator])
    }, { validators: this.crossFieldValidator });
    this.setupFormValueChanges();
  }

  ngOnInit(): void {
    this.addInvoiceItem();
    this.authService.getUserProfileData().subscribe({
      next: (userDetails: UserDetails) => {
        if (userDetails) {
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
  }

  setupFormValueChanges(): void {
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
        Validators.min(0.01),
        Validators.max(1000000)
      ]],
      vatRate: [0.25, Validators.required],
      amount: [0]
    });
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
    this.markFormGroupTouched(this.invoiceForm);
    if (this.invoiceForm.valid) {
      this.submitting = true;
      const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;
      const invoiceData: any = {
        receiptNumber: receiptNumber,
        customerNumber: this.invoiceForm.get('customerNumber')?.value,
        customerType: this.invoiceForm.get('customerType')?.value,
        organizationNumber: this.invoiceForm.get('organizationNumber')?.value,
        receiptDate: this.invoiceForm.get('receiptDate')?.value,
        dueDate: this.invoiceForm.get('dueDate')?.value,
        contactPerson: this.invoiceForm.get('contactPerson')?.value,
        email: this.invoiceForm.get('email')?.value || 'default@example.com',
        telephoneNumber: this.invoiceForm.get('telephoneNumber')?.value || '+46000000000',
        businessDescription: this.invoiceForm.get('businessDescription')?.value,
        businessCategory: this.invoiceForm.get('businessCategory')?.value,
        legalForm: this.invoiceForm.get('legalForm')?.value,
        vatNumber: this.invoiceForm.get('vatNumber')?.value,
        website: this.invoiceForm.get('website')?.value,
        invoiceItems: this.invoiceItems.controls.map(item => ({
          product: item.get('product')?.value,
          number: item.get('number')?.value,
          unit: item.get('unit')?.value,
          priceExclVAT: item.get('priceExclVAT')?.value,
          vatRate: item.get('vatRate')?.value,
          amount: item.get('amount')?.value
        })),
        subtotal: this.calculateTotals().net,
        moms: this.calculateTotals().vat,
        totally: this.calculateTotals().total,
        language: this.invoiceDetails.language as 'English' | 'Swedish' | 'Other',
        currency: this.invoiceDetails.currency as 'SEK' | 'USD' | 'EUR',
        customer: this.selectedCustomerId,
        organization: this.selectedOrganizationId,
        isReference: this.invoiceForm.get('isReference')?.value || false
      };
      this.invoiceService.createInvoice(invoiceData).subscribe({
        next: (response) => {
          this.submitting = false;
          this.toastr.success('Invoice created successfully');
          this.router.navigate(['/dashboard/invoices']);
        },
        error: (error) => {
          console.error('Invoice creation error', error);
          this.submitting = false;
          this.toastr.error('Failed to create invoice');
        }
      });
    } else {
      // Log invalid form fields
      const invalidFields = Object.keys(this.invoiceForm.controls)
        .filter(key => this.invoiceForm.get(key)?.invalid)
        .map(key => ({
          field: key,
          errors: this.invoiceForm.get(key)?.errors
        }));
      console.log('Invalid form fields:', invalidFields);
      this.toastr.error('Please fill in all required fields correctly');
    }
  }

  onSubmitAndSign(): void {
    this.markFormGroupTouched(this.invoiceForm);
    if (this.invoiceForm.valid) {
      this.submittingAndSigning = true;
      const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;
      
      // Get first invoice item as the main item
      const firstItem = this.invoiceItems.controls[0];
      const itemDescription = firstItem?.get('product')?.value || 'N/A';
      const itemPrice = firstItem?.get('priceExclVAT')?.value || '0';
      const itemNumber = firstItem?.get('number')?.value || 1;

      const receiptData = {
        // Receipt details
        receiptNumber: receiptNumber,
        receiptDate: this.invoiceForm.get('receiptDate')?.value,
        
        // Seller details (using company details)
        sellerName: this.companyDetails.name || 'Company Name',
        sellerOrg: this.companyDetails.orgNumber || '000000-0000',
        sellerTelephone: this.companyDetails.phone || '+46000000000',
        sellerEmail: this.companyDetails.email || 'info@company.com',
        sellerAddress: this.companyDetails.address || 'Company Address',
        sellerStatus: 'Active',
        sellerType: 'Company',
        
        // Customer details
        customerName: this.invoiceForm.get('contactPerson')?.value || 'Customer Name',
        customerOrg: this.invoiceForm.get('organizationNumber')?.value || '000000-0000',
        customerTelephone: this.invoiceForm.get('telephoneNumber')?.value,
        customerEmail: this.invoiceForm.get('email')?.value,
        customerAddress: 'Customer Address',
        customerStatus: 'Active',
        customerType: this.invoiceForm.get('customerType')?.value || 'Private',
        
        // Item details
        itemDescription: itemDescription,
        itemPrice: itemPrice.toString(),
        itemNumber: itemNumber,
        
        // Payment summary
        subtotal: this.calculateTotals().net.toString(),
        moms: this.calculateTotals().vat.toString(),
        totally: this.calculateTotals().total.toString(),

        // Additional fields
        customerNumber: this.invoiceForm.get('customerNumber')?.value,
        organizationNumber: this.invoiceForm.get('organizationNumber')?.value,
        dueDate: this.invoiceForm.get('dueDate')?.value,
        language: this.invoiceDetails.language,
        currency: this.invoiceDetails.currency
      };

      this.agreementService.createAndSignReceiptAgreement(receiptData).subscribe({
        next: (response) => {
          this.submittingAndSigning = false;
          this.toastr.success('Receipt created and signed successfully! Redirecting to sign...');
          
          // Redirect to sign-agreement with agreement ID
          const agreementId = response.data?.receipt_id || response.data?._id;
          if (agreementId) {
            this.router.navigate(['/sign', agreementId]);
          } else {
            this.router.navigate(['/dashboard/invoices']);
          }
        },
        error: (error) => {
          console.error('Receipt creation and signing error', error);
          this.submittingAndSigning = false;
          this.toastr.error(error.error?.message || 'Failed to create and sign receipt');
        }
      });
    } else {
      // Log invalid form fields
      const invalidFields = Object.keys(this.invoiceForm.controls)
        .filter(key => this.invoiceForm.get(key)?.invalid)
        .map(key => ({
          field: key,
          errors: this.invoiceForm.get(key)?.errors
        }));
      console.log('Invalid form fields:', invalidFields);
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

  onOrgSearch(): void {
    const organizationNumber = this.invoiceForm.get('organizationNumber')?.value;
    if (!organizationNumber || organizationNumber.trim() === '') {
      this.toastr.error('Please enter a valid organization number');
      return;
    }
    this.orgSearchLoading = true;
    this.corporationService.checkOrganizationExists(organizationNumber).subscribe({
      next: (response) => {
        this.orgSearchLoading = false;
        if (response.success && response.data) {
          const orgData = response.data;
          this.selectedOrganizationId = orgData._id || orgData.organization_number || '';
          this.invoiceForm.patchValue({
            email: orgData.company_email || '',
            telephoneNumber: orgData.company_phone || '',
            contactPerson: orgData.contact_person || '',
            businessDescription: orgData.business_description || '',
            businessCategory: orgData.business_category || '',
            legalForm: orgData.legal_form || '',
            vatNumber: orgData.vat_number || '',
            website: orgData.website || ''
          });
          this.companyDetails = {
            name: orgData.corp_name || '-',
            orgNumber: orgData.organization_number || '-',
            email: orgData.company_email || '-',
            phone: orgData.company_phone || '-',
            address: orgData.street_address || '-',
            bankgiro: '',
            vatNumber: orgData.vat_number || '-'
          };
          this.toastr.success('Organization found in database');
        } else {
          this.toastr.error('Organization not found in database. Please create the organization first.');
        }
      },
      error: (error) => {
        this.orgSearchLoading = false;
        this.toastr.error(error.error?.message || 'Failed to check organization in database');
      }
    });
  }

  searchCustomer(): void {
    const customerNumber = this.invoiceForm.get('customerNumber')?.value;
    if (!customerNumber || customerNumber.trim() === '') {
      this.toastr.error('Please enter a valid customer number');
      return;
    }
    this.customerSearchLoading = true;
    this.swishService.searchCustomerByNumber(customerNumber).subscribe({
      next: (response) => {
        this.customerSearchLoading = false;
        if (response.success && response.data) {
          const customerData = response.data;
          this.selectedCustomerId = customerData.customer_id;
          this.invoiceForm.patchValue({
            customerType: customerData.type || '',
            email: customerData.email || '',
            telephoneNumber: customerData.telephone || '',
            contactPerson: customerData.name || '',
            address: customerData.address || ''
          });
          const fieldsToDisable = [
            'customerType', 
            'email', 
            'telephoneNumber', 
            'contactPerson', 
            'address'
          ];
          fieldsToDisable.forEach(field => {
            const control = this.invoiceForm.get(field);
            if (control && control.value) {
              control.disable();
            }
          });
          this.toastr.success('Customer details retrieved successfully');
        } else {
          this.toastr.warning('Customer not found');
        }
      },
      error: (error) => {
        this.customerSearchLoading = false;
        this.toastr.error(error.error?.message || 'Error searching customer');
      }
    });
  }

  resetAutomaticFields(): void {
    const fieldsToReset = [
      'customerType', 
      'email', 
      'telephoneNumber', 
      'contactPerson', 
      'address'
    ];
    fieldsToReset.forEach(field => {
      const control = this.invoiceForm.get(field);
      if (control) {
        control.enable();
        control.setValue('');
      }
    });
    this.invoiceForm.get('customerNumber')?.setValue('');
  }

  noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    const isWhitespace = (control.value || '').trim().length === 0;
    return !isWhitespace ? null : { 'whitespace': true };
  }

  futureDateValidator(control: AbstractControl): ValidationErrors | null {
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    // Check if the date is a valid date
    if (isNaN(selectedDate.getTime())) {
      return { 'invalidDate': true };
    }
    
    // Check if the date is in the future or today
    return selectedDate >= today ? null : { 'pastDate': true };
  }

  dueDateValidator(control: AbstractControl): ValidationErrors | null {
    const parentForm = control.parent;
    if (!parentForm) return null;
    
    const receiptDate = parentForm.get('receiptDate')?.value;
    const dueDate = control.value;
    
    // Check if either date is invalid
    if (!receiptDate || !dueDate) return null;
    
    const receiptDateObj = new Date(receiptDate);
    const dueDateObj = new Date(dueDate);
    
    // Check if dates are valid
    if (isNaN(receiptDateObj.getTime()) || isNaN(dueDateObj.getTime())) {
      return { 'invalidDate': true };
    }
    
    // Check if due date is after or equal to receipt date
    // Also ensure due date is not more than a year in the future
    const maxDueDate = new Date(receiptDateObj);
    maxDueDate.setFullYear(maxDueDate.getFullYear() + 1);
    
    if (dueDateObj < receiptDateObj) {
      return { 'invalidDueDate': true };
    }
    
    if (dueDateObj > maxDueDate) {
      return { 'maxDueDate': true };
    }
    
    return null;
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
    return null;
  }

  emailValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) return null;
    return emailRegex.test(email) ? null : { 'invalidEmail': true };
  }

  telephoneValidator(control: AbstractControl): ValidationErrors | null {
    const phone = control.value;
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^\d]/g, '');
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
      errors.push('Invalid receipt date. Must be a future date within the next year.');
    }
    if (this.invoiceForm.get('dueDate')?.invalid) {
      errors.push('Invalid due date. Must be after receipt date and within the next year.');
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
}
