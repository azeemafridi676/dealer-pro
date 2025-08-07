import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AgreementService, SalesAgreementData, NewSalesAgreementPayload } from '../../../shared/service/agreement/agreement.service';
import { VehicleService } from '../../../shared/service/vehicle/vehicle.service';
import { CorporationService } from '../../../shared/service/corporation/corporation.service';
import { AuthService } from '../../../shared/service/Auth/Auth.service';
import { CustomerService } from '../../../shared/service/customer/customer.service';

// Interfaces for API responses
interface PersonSearchResponse {
  success: boolean;
  data?: {
    _type: string;
    id: string;
    country: string;
    legalId: string;
    birthDate: string;
    gender: string;
    name: {
      country: string;
      names: string[];
      lastName: string;
      givenName: string;
    };
    addresses: Array<{
      _type: string;
      kind: string;
      country: string;
      street: string;
      number: string;
      numberSuffix?: string;
      flat?: string;
      zip: string;
      city: string;
      county?: string;
      municipality?: string;
      id: string;
    }>;
  };
  message?: string;
}

interface OrganizationSearchResponse {
  success: boolean;
  data?: {
    organization_number: string;
    corp_name: string;
    street_address: string;
    registered_city: string;
    postal_code: string;
    city: string;
    company_email: string;
    company_phone: string;
    vat_number: string;
    is_f_skatt_payer: boolean;
    contact_person: string;
    business_description: string;
    business_category: string;
    legal_form: string;
    website: string;
    established_year: number;
    company_status: string;
  };
  message?: string;
}

export interface TradeInVehicleDetails {
  registrationNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  mileage: number;
  creditMarking: string;
  creditor?: string;
  creditAmount?: number;
  vehicleDetails?: any;
}

interface SalesAgreementPreview {
  // Basic Information
  registrationNumber: string;
  salesDate: string;
  customerType: string;
  emailAddress: string;
  
  // Company specific fields
  organizationNumber?: string;
  companyName?: string;
  streetAddress?: string;
  city?: string;
  postalCode?: string;
  contactPerson?: string;
  businessCategory?: string;
  legalForm?: string;

  // Private individual specific fields
  customerName?: string;
  legalId?: string;
  street?: string;
  zip?: string;
  telephoneNumber?: string;

  // Trade-in Vehicle Information
  tradeInVehicle?: string;
  tradeInRegistrationNumber?: string;
  tradeInPurchaseDate?: string;
  tradeInPurchasePrice?: number;
  tradeInMileage?: number;
  tradeInCreditMarking?: string;
  tradeInCreditor?: string;
  tradeInCreditAmount?: number;
  tradeInVehicleDetails?: any;

  // Common fields
  salesPrice?: number;
  paymentMethod?: string;
  vatType?: string;
  mileage?: number;
  numberOfKeys?: string;
  deck?: string;
  insurer?: string;
  insuranceType?: string;
  warrantyProvider?: string;
  warrantyProduct?: string;
  freeTextPayment?: string;

  // Financing fields
  creditor?: string;
  creditAmount?: number;
  cashBet?: string;
  loanPeriod?: number;

  // Leasing fields
  leasingProvider?: string;
  leasingAmount?: number;
  leasingPeriod?: number;

  // Vehicle Information
  vehicleDetails?: any;

  // Seller Information
  seller: {
    name: string;
    organizationName: string;
    organizationNumber: string;
    email: string;
    phone: string;
    address: string;
    businessCategory: string;
    legalForm: string;
  };
}

@Component({
  selector: 'app-sales-agreement',
  templateUrl: './sales-agreement.component.html'
})
export class SalesAgreementComponent implements OnInit {
  // Stepper logic
  currentStep = 1;
  totalSteps = 3;
  isSubmitting = false;
  isSubmittingAndSigning = false;

  // New properties for vehicle search
  vehicleSearching = false;
  vehicleSearched = false;
  vehicleDetails: any = null;
  showVehicleDetailsModal = false;

  // Org search state for buyer/seller
  buyerOrgSearchLoading = false;
  buyerOrgSearched = false;
  buyerOrgData: any = null;
  buyerOrgError = '';
  sellerOrgSearchLoading = false;
  sellerOrgSearched = false;
  sellerOrgData: any = null;
  sellerOrgError = '';

  // Combined form group for all sections
  agreementForm: FormGroup;

  personSearchLoading = false;

  // Add new property for trade-in vehicle details
  tradeInVehicleDetails: any = null;
  tradeInVehicleSearching = false;

  personData: any;

  // Add these properties
  isEditMode = false;
  agreementId: string | null = null;

  constructor(
    private fb: FormBuilder, 
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private agreementService: AgreementService,
    private vehicleService: VehicleService,
    private corporationService: CorporationService,
    private authService: AuthService,
    private customerService: CustomerService
  ) {
    // Initialize combined form with all sections
    this.agreementForm = this.fb.group({
      // Basic Information
      registrationNumber: ['', Validators.required],
      salesDate: ['', Validators.required],
      customerType: ['', Validators.required],
      emailAddress: ['', [Validators.required, Validators.email]],
      telephoneNumber: ['', Validators.required],

      // Company Fields
      organizationNumber: [''],
      companyName: [''],
      streetAddress: [''],
      city: [''],
      postalCode: [''],
      contactPerson: [''],
      businessCategory: ['Not Specified'],
      legalForm: ['Not Specified'],

      // Private Individual Fields
      customerName: [''],
      socialSecurityNumber: [''],
      legalId: [''],
      street: [''],
      zip: [''],

      // Trade-in Vehicle
      tradeInVehicle: ['', [Validators.required]],
      // Trade-in Vehicle Details
      tradeInRegistrationNumber: [''],
      tradeInPurchaseDate: [''],
      tradeInPurchasePrice: [''],
      tradeInMileage: [''],
      tradeInCreditMarking: [''],
      tradeInCreditor: [''],
      tradeInCreditAmount: [''],

      // Sales Information
      salesPrice: ['', [Validators.required]],
      paymentMethod: ['', [Validators.required]],
      
      // Financing fields
      creditor: [''],
      creditAmount: [''],
      cashBet: [''],
      loanPeriod: [''],

      // Leasing fields
      leasingProvider: [''],
      leasingAmount: [''],
      leasingPeriod: [''],

      // Vehicle Information
      vatType: ['', [Validators.required]],
      mileage: ['', [Validators.required]],
      numberOfKeys: ['', [Validators.required]],
      deck: ['', [Validators.required]],
      insurer: [''],
      insuranceType: ['', [Validators.required]],
      warrantyProvider: [''],
      warrantyProduct: [''],

      // Payment Information
      freeTextPayment: [''],

      // Seller Fields
      sellerName: [''],
      sellerOrganizationName: [''],
      sellerOrganizationNumber: [''],
      sellerEmail: ['', [Validators.email]],
      sellerPhone: [''],
      sellerAddress: [''],
      sellerBusinessCategory: [''],
      sellerLegalForm: ['']
    });

    // Add conditional validation based on customer type
    this.agreementForm.get('customerType')?.valueChanges.subscribe(type => {
      const orgNumberControl = this.agreementForm.get('organizationNumber');
      const telephoneControl = this.agreementForm.get('telephoneNumber');
      
      if (type === 'Company') {
        orgNumberControl?.setValidators([Validators.required]);
        telephoneControl?.clearValidators();
      } else if (type === 'Private Individual') {
        telephoneControl?.setValidators([Validators.required]);
        orgNumberControl?.clearValidators();
      }
      
      orgNumberControl?.updateValueAndValidity();
      telephoneControl?.updateValueAndValidity();
    });

    // Add conditional validation based on trade-in vehicle selection
    this.agreementForm.get('tradeInVehicle')?.valueChanges.subscribe(value => {
      const tradeInControls = [
        'tradeInRegistrationNumber',
        'tradeInPurchaseDate',
        'tradeInPurchasePrice',
        'tradeInMileage',
        'tradeInCreditMarking'
      ];

      if (value === 'Yes') {
        tradeInControls.forEach(control => {
          this.agreementForm.get(control)?.setValidators([Validators.required]);
        });
      } else {
        tradeInControls.forEach(control => {
          this.agreementForm.get(control)?.clearValidators();
          this.agreementForm.get(control)?.setValue('');
        });
      }
      tradeInControls.forEach(control => {
        this.agreementForm.get(control)?.updateValueAndValidity();
      });
    });

    // Add conditional validation for credit marking
    this.agreementForm.get('tradeInCreditMarking')?.valueChanges.subscribe(value => {
      const creditControls = ['tradeInCreditor', 'tradeInCreditAmount'];

      if (value === 'Yes') {
        creditControls.forEach(control => {
          this.agreementForm.get(control)?.setValidators([Validators.required]);
        });
      } else {
        creditControls.forEach(control => {
          this.agreementForm.get(control)?.clearValidators();
          this.agreementForm.get(control)?.setValue('');
        });
      }
      creditControls.forEach(control => {
        this.agreementForm.get(control)?.updateValueAndValidity();
      });
    });

    // Add payment method change subscription
    this.agreementForm.get('paymentMethod')?.valueChanges.subscribe(method => {
      const financingControls = ['creditor', 'creditAmount', 'cashBet', 'loanPeriod'];
      const leasingControls = ['leasingProvider', 'leasingAmount', 'leasingPeriod'];
      
      if (method === 'Financing with Down Payment') {
        financingControls.forEach(control => {
          this.agreementForm.get(control)?.setValidators([Validators.required]);
          this.agreementForm.get(control)?.updateValueAndValidity();
        });
        leasingControls.forEach(control => {
          this.agreementForm.get(control)?.clearValidators();
          this.agreementForm.get(control)?.setValue('');
          this.agreementForm.get(control)?.updateValueAndValidity();
        });
      } else if (method === 'Financing without Down Payment') {
        financingControls.forEach(control => {
          if (control !== 'cashBet') {
            this.agreementForm.get(control)?.setValidators([Validators.required]);
            this.agreementForm.get(control)?.updateValueAndValidity();
          }
        });
        this.agreementForm.get('cashBet')?.clearValidators();
        this.agreementForm.get('cashBet')?.setValue('');
        leasingControls.forEach(control => {
          this.agreementForm.get(control)?.clearValidators();
          this.agreementForm.get(control)?.setValue('');
          this.agreementForm.get(control)?.updateValueAndValidity();
        });
      } else if (method === 'Leasing') {
        leasingControls.forEach(control => {
          this.agreementForm.get(control)?.setValidators([Validators.required]);
          this.agreementForm.get(control)?.updateValueAndValidity();
        });
        financingControls.forEach(control => {
          this.agreementForm.get(control)?.clearValidators();
          this.agreementForm.get(control)?.setValue('');
          this.agreementForm.get(control)?.updateValueAndValidity();
        });
      } else {
        [...financingControls, ...leasingControls].forEach(control => {
          this.agreementForm.get(control)?.clearValidators();
          this.agreementForm.get(control)?.setValue('');
          this.agreementForm.get(control)?.updateValueAndValidity();
        });
      }
    });
  }

  // Custom email validator to provide more specific error messages
  private customEmailValidator(control: AbstractControl) {
    const value = control.value;
    
    // Check if email is empty (handled by required validator)
    if (!value) return null;

    // Basic email regex with more lenient validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(value)) {
      return { 
        invalidEmail: true,
        message: 'Please enter a valid email address (e.g., example@domain.com)'
      };
    }

    return null;
  }

  // Setup real-time validation tracking
  private setupRealTimeValidation() {
    Object.keys(this.agreementForm.controls).forEach(controlName => {
      const control = this.agreementForm.get(controlName);
      
      if (control) {
        control.valueChanges.subscribe(() => {
          // Trigger validation on value change
          control.markAsTouched();
        });
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard/agreements']);
  }

  // Utility method to format date
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  // New method to auto-fill form with vehicle details
  autoFillVehicleDetails() {
    if (!this.vehicleDetails) return;

    const data = this.vehicleDetails;
    const registrationData = data.registrationData || {};
    const detail = data.detail || {};
    const status = data.status || {};
    const inspection = data.inspection || {};
    const technicalData = data.technicalData || {};

    // Only autofill if the field is empty
    const patch: any = {};
    
    // Basic Vehicle Information
    if (!this.agreementForm.get('registrationNumber')?.value) {
      patch.registrationNumber = registrationData.registrationNumber || '';
    }
    if (!this.agreementForm.get('salesDate')?.value) {
      patch.salesDate = registrationData.registeredOn || '';
    }
    if (!this.agreementForm.get('mileage')?.value) {
      patch.mileage = inspection.mileage || '';
    }
    if (!this.agreementForm.get('vatType')?.value) {
      patch.vatType = status.registrationType || '';
    }
    if (!this.agreementForm.get('insuranceType')?.value) {
      patch.insuranceType = status.insuranceType || '';
    }

    // Additional Vehicle Details
    if (!this.agreementForm.get('numberOfKeys')?.value) {
      // Default to 2 keys if not specified
      patch.numberOfKeys = '2';
    }
    if (!this.agreementForm.get('deck')?.value) {
      // Default to Summer Tires if not specified
      patch.deck = 'Summer Tires';
    }
    if (!this.agreementForm.get('warrantyProvider')?.value) {
      patch.warrantyProvider = detail.manufacturer ? detail.manufacturer.split(',')[0] : '';
    }
    if (!this.agreementForm.get('warrantyProduct')?.value) {
      patch.warrantyProduct = `${detail.vehicleBrandRaw || ''} ${detail.vehicleModelRaw || ''} Warranty`;
    }

    // Apply the patch to the form
    this.agreementForm.patchValue(patch);
  }

  // Vehicle search method
  searchVehicle() {
    const registrationNumber = this.agreementForm.get('registrationNumber')?.value;
    
    if (!registrationNumber) {
      this.toastr.error('Please enter a registration number');
      return;
    }

    this.vehicleSearching = true;
    this.vehicleSearched = false;
    this.vehicleDetails = null;

    this.vehicleService.searchVehicleByRegistration(registrationNumber).subscribe({
      next: (response) => {
        this.vehicleSearching = false;
        if (response.success) {
          this.vehicleSearched = true;
          this.vehicleDetails = response.data;
          this.toastr.success('Vehicle found successfully');
          
          // Auto-fill vehicle details
          this.autoFillVehicleDetails();
        } else {
          this.toastr.error(response.message || 'Vehicle not found');
        }
      },
      error: (error) => {
        this.vehicleSearching = false;
        console.error('Vehicle search error:', error);
        this.toastr.error('Failed to search vehicle');
      }
    });
  }

  // Method to open vehicle details modal
  openVehicleDetailsModal() {
    if (this.vehicleDetails) {
      this.showVehicleDetailsModal = true;
    }
  }

  // Method to close vehicle details modal
  closeVehicleDetailsModal() {
    this.showVehicleDetailsModal = false;
  }

  // Override nextStep to check vehicle search
  nextStep() {
    if (this.currentStep === 1) {
      // Check vehicle registration search
      if (!this.vehicleSearched) {
        this.toastr.error('Please search and verify vehicle registration');
        return;
      }
    }

    if (this.currentStep < this.totalSteps) {
      const currentForm = this.getCurrentForm();
      
      // Mark all fields as touched to show validation errors
      Object.keys(currentForm.controls).forEach(field => {
        const control = currentForm.get(field);
        control?.markAsTouched();
      });

      if (currentForm.invalid) {
        this.toastr.error('Please correct the highlighted fields before proceeding');
        return;
      }
      this.currentStep++;
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  private getCurrentForm(): FormGroup {
    switch (this.currentStep) {
      case 1: return this.agreementForm;
      case 2: return this.agreementForm;
      case 3: return this.agreementForm;
      default: return this.agreementForm;
    }
  }

  ngOnInit(): void {
    // Check if we're in edit mode
    this.route.params.subscribe(params => {
      this.agreementId = params['id'];
      this.isEditMode = !!this.agreementId;

      if (this.isEditMode) {
        this.loadAgreementForEdit();
      }
    });

    this.setupRealTimeValidation();
    this.populateSellerDetails();
    
    // Watch buyerType/sellerType for dynamic UI
    this.agreementForm.get('buyerType')?.valueChanges.subscribe(type => this.onBuyerTypeChange(type));
    this.agreementForm.get('sellerType')?.valueChanges.subscribe(type => this.onSellerTypeChange(type));
  }

  private populateSellerDetails() {
    this.authService.getUserDetails().subscribe(user => {
      if (user) {
        this.agreementForm.patchValue({
          sellerName: `${user.first_name} ${user.last_name}`,
          sellerOrganizationName: user.organization?.organization_name || user.corp?.corp_name || '',
          sellerOrganizationNumber: user.organization?.organization_number || '',
          sellerEmail: user.organization?.company_email || user.email || '',
          sellerPhone: user.organization?.company_phone || user.mobile || '',
          sellerAddress: user.organization?.company_address || '',
          sellerBusinessCategory: user.organization?.business_category || '',
          sellerLegalForm: user.organization?.legal_form || ''
        });
      }
    });
  }

  // --- Buyer Org Search Logic ---
  onBuyerOrgSearch() {
    const orgNumber = this.agreementForm.get('buyerSocialSecurityNumber')?.value;
    if (!orgNumber || orgNumber.trim() === '') {
      this.toastr.error('Please enter a valid organization number');
      return;
    }
    this.buyerOrgSearchLoading = true;
    this.buyerOrgError = '';
    this.corporationService.checkOrganizationExists(orgNumber).subscribe({
      next: (response) => {
        this.buyerOrgSearchLoading = false;
        if (response.success && response.data) {
          this.buyerOrgSearched = true;
          this.buyerOrgData = response.data;
          this.patchBuyerOrgFields(response.data);
          this.toastr.success('Organization found');
        } else {
          this.buyerOrgSearched = false;
          this.buyerOrgData = null;
          this.buyerOrgError = 'Organization not found.';
          this.toastr.error('Organization not found.');
        }
      },
      error: (err) => {
        this.buyerOrgSearchLoading = false;
        this.buyerOrgSearched = false;
        this.buyerOrgData = null;
        this.buyerOrgError = err.error?.message || 'Failed to search organization.';
        this.toastr.error(this.buyerOrgError);
      }
    });
  }

  patchBuyerOrgFields(org: any) {
    this.agreementForm.patchValue({
      buyerOrganisation: org.corp_name || '',
      buyerAddress: org.street_address || '',
      buyerEmail: org.company_email || '',
      buyerTelephone: org.company_phone || '',
      buyerPostalCode: org.postal_code || '',
      buyerLocation: org.city || ''
    });
    // Disable autofilled fields if not empty
    const fields = ['buyerOrganisation', 'buyerAddress', 'buyerEmail', 'buyerTelephone', 'buyerPostalCode', 'buyerLocation'];
    fields.forEach(field => {
      const control = this.agreementForm.get(field);
      if (control && control.value && control.value.trim() !== '') {
        control.disable();
      }
    });
  }

  onBuyerTypeChange(type: string) {
    if (type === 'Company') {
      this.resetBuyerOrgFields();
      this.agreementForm.get('buyerSocialSecurityNumber')?.setValidators([Validators.required, Validators.pattern(/^\d{6}-\d{4}$/)]);
    } else {
      this.resetBuyerOrgFields();
      this.agreementForm.get('buyerSocialSecurityNumber')?.setValidators([Validators.required]);
    }
    this.agreementForm.get('buyerSocialSecurityNumber')?.updateValueAndValidity();
  }

  resetBuyerOrgFields() {
    this.buyerOrgSearched = false;
    this.buyerOrgError = '';
    const fields = ['buyerOrganisation', 'buyerAddress', 'buyerEmail', 'buyerTelephone', 'buyerPostalCode', 'buyerLocation'];
    fields.forEach(field => {
      const control = this.agreementForm.get(field);
      if (control) {
        control.enable();
        control.setValue('');
      }
    });
  }

  // --- Seller Org Search Logic ---
  onSellerOrgSearch() {
    const orgNumber = this.agreementForm.get('sellerCorporateNumber')?.value;
    if (!orgNumber || orgNumber.trim() === '') {
      this.toastr.error('Please enter a valid organization number');
      return;
    }
    this.sellerOrgSearchLoading = true;
    this.sellerOrgError = '';
    this.corporationService.checkOrganizationExists(orgNumber).subscribe({
      next: (response) => {
        this.sellerOrgSearchLoading = false;
        if (response.success && response.data) {
          this.sellerOrgSearched = true;
          this.sellerOrgData = response.data;
          this.patchSellerOrgFields(response.data);
          this.toastr.success('Organization found');
        } else {
          this.sellerOrgSearched = false;
          this.sellerOrgData = null;
          this.sellerOrgError = 'Organization not found.';
          this.toastr.error('Organization not found.');
        }
      },
      error: (err) => {
        this.sellerOrgSearchLoading = false;
        this.sellerOrgSearched = false;
        this.sellerOrgData = null;
        this.sellerOrgError = err.error?.message || 'Failed to search organization.';
        this.toastr.error(this.sellerOrgError);
      }
    });
  }

  patchSellerOrgFields(org: any) {
    this.agreementForm.patchValue({
      sellerOrganisation: org.corp_name || '',
      sellerAddress: org.street_address || '',
      sellerEmail: org.company_email || '',
      sellerTelephone: org.company_phone || '',
      sellerPostalCode: org.postal_code || '',
      sellerLocation: org.city || ''
    });
    // Disable autofilled fields if not empty
    const fields = ['sellerOrganisation', 'sellerAddress', 'sellerEmail', 'sellerTelephone', 'sellerPostalCode', 'sellerLocation'];
    fields.forEach(field => {
      const control = this.agreementForm.get(field);
      if (control && control.value && control.value.trim() !== '') {
        control.disable();
      }
    });
  }

  onSellerTypeChange(type: string) {
    if (type === 'Company') {
      this.resetSellerOrgFields();
      this.agreementForm.get('sellerCorporateNumber')?.setValidators([Validators.required, Validators.pattern(/^\d{6}-\d{4}$/)]);
    } else {
      this.resetSellerOrgFields();
      this.agreementForm.get('sellerCorporateNumber')?.setValidators([Validators.required]);
    }
    this.agreementForm.get('sellerCorporateNumber')?.updateValueAndValidity();
  }

  resetSellerOrgFields() {
    this.sellerOrgSearched = false;
    this.sellerOrgError = '';
    const fields = ['sellerOrganisation', 'sellerAddress', 'sellerEmail', 'sellerTelephone', 'sellerPostalCode', 'sellerLocation'];
    fields.forEach(field => {
      const control = this.agreementForm.get(field);
      if (control) {
        control.enable();
        control.setValue('');
      }
    });
  }

  // --- Submit validation ---
  onSubmit() {
    this.markFormGroupTouched(this.agreementForm);
    this.logFormErrors(this.agreementForm);

    if (this.agreementForm.valid) {
      this.isSubmitting = true;
      const formData = this.agreementForm.value;

      // Prepare data according to new structure
      const payload: NewSalesAgreementPayload = {
        customerType: formData.customerType,
        
        sales_details: {
          registrationNumber: formData.registrationNumber,
          salesDate: formData.salesDate,
          emailAddress: formData.emailAddress,
          telephoneNumber: formData.telephoneNumber,
          salesPrice: formData.salesPrice,
          paymentMethod: formData.paymentMethod,
          vatType: formData.vatType,
          mileage: formData.mileage,
          numberOfKeys: formData.numberOfKeys,
          deck: formData.deck,
          insurer: formData.insurer,
          insuranceType: formData.insuranceType,
          warrantyProvider: formData.warrantyProvider,
          warrantyProduct: formData.warrantyProduct,
          freeTextPayment: formData.freeTextPayment
        },
        
        vehicle_details: this.vehicleDetails || {}
      };

      // Add trade-in vehicle details if applicable
      if (formData.tradeInVehicle === 'Yes') {
        payload.sales_details.tradeInVehicle = {
          registrationNumber: formData.tradeInRegistrationNumber,
          purchaseDate: formData.tradeInPurchaseDate,
          purchasePrice: formData.tradeInPurchasePrice,
          mileage: formData.tradeInMileage,
          creditMarking: formData.tradeInCreditMarking,
          ...(formData.tradeInCreditMarking === 'Yes' && {
            creditor: formData.tradeInCreditor,
            creditAmount: formData.tradeInCreditAmount
          }),
          vehicleDetails: this.tradeInVehicleDetails || {}
        };
      }

      // Add payment method specific details
      if (formData.paymentMethod === 'Financing with Down Payment' || formData.paymentMethod === 'Financing without Down Payment') {
        payload.sales_details.financing = {
          creditor: formData.creditor,
          creditAmount: formData.creditAmount,
          loanPeriod: formData.loanPeriod,
          ...(formData.paymentMethod === 'Financing with Down Payment' && {
            cashBet: formData.cashBet
          })
        };
      } else if (formData.paymentMethod === 'Leasing') {
        payload.sales_details.leasing = {
          provider: formData.leasingProvider,
          amount: formData.leasingAmount,
          period: formData.leasingPeriod
        };
      }

      // Add customer type specific details
      if (formData.customerType === 'Company') {
        payload.organization_detail = {
          organization_number: formData.organizationNumber,
          corp_name: formData.companyName,
          street_address: formData.streetAddress,
          registered_city: formData.city,
          postal_code: formData.postalCode,
          city: formData.city,
          company_email: formData.emailAddress,
          company_phone: {
            number: formData.telephoneNumber
          }
        };
      } else {
        if (this.personData) {
          payload.person_detail = {
            _type: 'SE_PERSON',
            id: this.personData.id,
            country: this.personData.country,
            legalId: this.personData.legalId,
            birthDate: this.personData.birthDate,
            gender: this.personData.gender,
            name: {
              names: this.personData.name.names,
              lastName: this.personData.name.lastName,
              givenName: this.personData.name.givenName
            },
            addresses: this.personData.addresses.map((addr: { street: string; number: string; zip: string; city: string; }) => ({
              street: addr.street,
              number: addr.number,
              zip: addr.zip,
              city: addr.city
            }))
          };
        }
      }

      // Determine whether to create or update
      if (this.isEditMode && this.agreementId) {
        // Update existing agreement
        this.agreementService.updateSalesAgreement(this.agreementId, payload).subscribe({
          next: (response) => {
            this.isSubmitting = false;
            if (response.success) {
              this.toastr.success('Sales agreement updated successfully');
              this.router.navigate(['/dashboard/agreements']);
            } else {
              this.toastr.error(response.message || 'Failed to update sales agreement');
            }
          },
          error: (error) => {
            this.isSubmitting = false;
            console.error('Error updating sales agreement:', error);
            this.toastr.error(error.error?.message || 'Failed to update sales agreement');
          }
        });
      } else {
        // Create new agreement (existing logic)
        this.agreementService.createSalesAgreement(payload).subscribe({
          next: (response) => {
            this.isSubmitting = false;
            if (response.success) {
              this.toastr.success('Sales agreement created successfully');
              this.router.navigate(['/dashboard/agreements']);
            } else {
              this.toastr.error(response.message || 'Failed to create sales agreement');
            }
          },
          error: (error) => {
            this.isSubmitting = false;
            console.error('Error creating sales agreement:', error);
            this.toastr.error(error.error?.message || 'Failed to create sales agreement');
          }
        });
      }
    } else {
      this.toastr.error('Please correct the highlighted fields before submitting');
      console.error('Form Validation Errors:', this.getFormValidationErrors());
    }
  }

  onSubmitAndSign() {
    this.markFormGroupTouched(this.agreementForm);

    if (this.agreementForm.valid) {
      this.isSubmittingAndSigning = true;
      const formData = this.agreementForm.value;

      // Prepare data according to new structure
      const payload: NewSalesAgreementPayload = {
        customerType: formData.customerType,
        
        sales_details: {
          registrationNumber: formData.registrationNumber,
          salesDate: formData.salesDate,
          emailAddress: formData.emailAddress,
          telephoneNumber: formData.telephoneNumber,
          salesPrice: formData.salesPrice,
          paymentMethod: formData.paymentMethod,
          vatType: formData.vatType,
          mileage: formData.mileage,
          numberOfKeys: formData.numberOfKeys,
          deck: formData.deck,
          insurer: formData.insurer,
          insuranceType: formData.insuranceType,
          warrantyProvider: formData.warrantyProvider,
          warrantyProduct: formData.warrantyProduct,
          freeTextPayment: formData.freeTextPayment
        },
        
        vehicle_details: this.vehicleDetails || {}
      };

      // Add trade-in vehicle details if applicable
      if (formData.tradeInVehicle === 'Yes') {
        payload.sales_details.tradeInVehicle = {
          registrationNumber: formData.tradeInRegistrationNumber,
          purchaseDate: formData.tradeInPurchaseDate,
          purchasePrice: formData.tradeInPurchasePrice,
          mileage: formData.tradeInMileage,
          creditMarking: formData.tradeInCreditMarking,
          ...(formData.tradeInCreditMarking === 'Yes' && {
            creditor: formData.tradeInCreditor,
            creditAmount: formData.tradeInCreditAmount
          }),
          vehicleDetails: this.tradeInVehicleDetails || {}
        };
      }

      // Add payment method specific details
      if (formData.paymentMethod === 'Financing with Down Payment' || formData.paymentMethod === 'Financing without Down Payment') {
        payload.sales_details.financing = {
          creditor: formData.creditor,
          creditAmount: formData.creditAmount,
          loanPeriod: formData.loanPeriod,
          ...(formData.paymentMethod === 'Financing with Down Payment' && {
            cashBet: formData.cashBet
          })
        };
      } else if (formData.paymentMethod === 'Leasing') {
        payload.sales_details.leasing = {
          provider: formData.leasingProvider,
          amount: formData.leasingAmount,
          period: formData.leasingPeriod
        };
      }

      // Add customer type specific details
      if (formData.customerType === 'Company') {
        payload.organization_detail = {
          organization_number: formData.organizationNumber,
          corp_name: formData.companyName,
          street_address: formData.streetAddress,
          registered_city: formData.city,
          postal_code: formData.postalCode,
          city: formData.city,
          company_email: formData.emailAddress,
          company_phone: {
            number: formData.telephoneNumber
          }
        };
      } else {
        if (this.personData) {
          payload.person_detail = {
            _type: 'SE_PERSON',
            id: this.personData.id,
            country: this.personData.country,
            legalId: this.personData.legalId,
            birthDate: this.personData.birthDate,
            gender: this.personData.gender,
            name: {
              names: this.personData.name.names,
              lastName: this.personData.name.lastName,
              givenName: this.personData.name.givenName
            },
            addresses: this.personData.addresses.map((addr: { street: string; number: string; zip: string; city: string; }) => ({
              street: addr.street,
              number: addr.number,
              zip: addr.zip,
              city: addr.city
            }))
          };
        }
      }

      this.agreementService.createAndSignSalesAgreement(payload).subscribe({
        next: (response) => {
          this.isSubmittingAndSigning = false;
          if (response.success) {
            this.toastr.success('Sales agreement created and signed successfully');
            const agreementId = response.data?.agreement_id || response.data?._id;
            if (agreementId) {
              this.router.navigate(['/sign', agreementId]);
            } else {
              this.router.navigate(['/dashboard/agreements']);
            }
          } else {
            this.toastr.error(response.message || 'Failed to create sales agreement');
          }
        },
        error: (error) => {
          this.isSubmittingAndSigning = false;
          console.error('Error creating sales agreement:', error);
          this.toastr.error(error.error?.message || 'Failed to create sales agreement');
        }
      });
    } else {
      this.toastr.error('Please correct the highlighted fields before submitting');
      console.error('Form Validation Errors:', this.getFormValidationErrors());
    }
  }

  // Method to search person by social security number
  searchOrganization() {
    if (this.agreementForm.get('customerType')?.value === 'Company') {
      const orgNumber = this.agreementForm.get('organizationNumber')?.value;
      if (!orgNumber) {
        this.toastr.error('Please enter an organization number');
        return;
      }
      this.buyerOrgSearchLoading = true;
      this.corporationService.publicSearchOrganization(orgNumber).subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            this.buyerOrgData = response.data;
            this.agreementForm.patchValue({
              companyName: response.data.corp_name || '',
              streetAddress: response.data.street_address || '',
              city: response.data.city || response.data.registered_city || '',
              postalCode: response.data.postal_code || '',
              emailAddress: response.data.company_email || this.agreementForm.get('emailAddress')?.value || '',
              telephoneNumber: response.data.company_phone?.number || response.data.company_phone || this.agreementForm.get('telephoneNumber')?.value || '',
              organizationNumber: response.data.organization_number || this.agreementForm.get('organizationNumber')?.value || ''
            });
            this.buyerOrgSearched = true;
            this.toastr.success('Organization found');
          } else {
            this.buyerOrgError = 'Organization not found';
            this.toastr.error('Organization not found');
          }
        },
        error: (error: any) => {
          this.buyerOrgError = error.error?.message || 'Failed to search organization';
          this.toastr.error(this.buyerOrgError);
        },
        complete: () => {
          this.buyerOrgSearchLoading = false;
        }
      });
    } else {
      const ssn = this.agreementForm.get('socialSecurityNumber')?.value;
      if (!ssn) {
        this.toastr.error('Please enter a social security number');
        return;
      }
      this.personSearchLoading = true;
      this.customerService.searchBySSN(ssn).subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            const personData = response.data;
            const address = personData.addresses[0] || {};
            
            // Store the full person data for later use in agreement creation
            this.personData = {
              id: personData.id,
              _type: personData._type,
              country: personData.country,
              legalId: personData.legalId,
              birthDate: personData.birthDate,
              gender: personData.gender,
              name: personData.name,
              addresses: personData.addresses,
              addressHistory: personData.addressHistory,
              relationsInfos: personData.relationsInfos,
              registrationStatus: personData.registrationStatus,
              phones: personData.phones || [],
              events: personData.events || [],
              protections: personData.protections || [],
              legalIdHistory: personData.legalIdHistory || [],
              residence: personData.residence,
              lkf: personData.lkf
            };
            
            // Patch form with extracted information
            this.agreementForm.patchValue({
              customerName: `${personData.name.givenName} ${personData.name.lastName}`,
              legalId: personData.legalId,
              street: `${address.street} ${address.number}${address.numberSuffix ? ' ' + address.numberSuffix : ''}${address.flat ? ' Lgh ' + address.flat : ''}`.trim(),
              city: address.city || '',
              zip: address.zip || '',
              emailAddress: '',  // Email not provided in person search response
              socialSecurityNumber: ssn
            });
            this.toastr.success('Person found');
          } else {
            this.toastr.error('Person not found');
            this.personSearchLoading = false;

          }
        },
        error: (error: any) => {
          this.toastr.error(error.error?.message || 'Failed to search person');
          this.personSearchLoading = false;
        },
        complete: () => {
          this.personSearchLoading = false;
        }
      });
    }
  }

  // Method to search trade-in vehicle
  searchTradeInVehicle() {
    const registrationNumber = this.agreementForm.get('tradeInRegistrationNumber')?.value;
    
    if (!registrationNumber) {
      this.toastr.error('Please enter a registration number');
      return;
    }

    this.tradeInVehicleSearching = true;
    this.vehicleService.searchVehicleByRegistration(registrationNumber).subscribe({
      next: (response) => {
        if (response.success) {
          this.tradeInVehicleDetails = response.data;
          // Auto-fill mileage if available
          if (response.data?.inspection?.mileage) {
            this.agreementForm.patchValue({
              tradeInMileage: response.data.inspection.mileage
            });
          }
          this.toastr.success('Trade-in vehicle found successfully');
        } else {
          this.toastr.error(response.message || 'Vehicle not found');
        }
      },
      error: (error) => {
        console.error('Trade-in vehicle search error:', error);
        this.toastr.error('Failed to search vehicle');
      },
      complete: () => {
        this.tradeInVehicleSearching = false;
      }
    });
  }

  // Combine all form values for preview
  get preview(): SalesAgreementPreview {
    const form = this.agreementForm.getRawValue();
    
    // Determine customer details based on customer type
    let customerDetails: any = null;
    if (form.customerType === 'Company') {
      customerDetails = 
        this.agreementForm.get('organizationNumber')?.value && {
          organizationNumber: this.agreementForm.get('organizationNumber')?.value,
          companyName: this.agreementForm.get('companyName')?.value,
          streetAddress: this.agreementForm.get('streetAddress')?.value,
          city: this.agreementForm.get('city')?.value,
          postalCode: this.agreementForm.get('postalCode')?.value
        };
    } else {
      customerDetails = {
        customerName: this.agreementForm.get('customerName')?.value,
        legalId: this.agreementForm.get('socialSecurityNumber')?.value,
        street: this.agreementForm.get('street')?.value,
        zip: this.agreementForm.get('zip')?.value
      };
    }

    const sellerInfo = {
      name: form.sellerName || '',
      organizationName: form.sellerOrganizationName || '',
      organizationNumber: form.sellerOrganizationNumber || '',
      email: form.sellerEmail || '',
      phone: form.sellerPhone || '',
      address: form.sellerAddress || '',
      businessCategory: form.sellerBusinessCategory || '',
      legalForm: form.sellerLegalForm || ''
    };

    const previewData: SalesAgreementPreview = {
      // Basic Information
      registrationNumber: form.registrationNumber,
      salesDate: form.salesDate,
      customerType: form.customerType,
      emailAddress: form.emailAddress,
      
      // Company specific fields
      ...(form.customerType === 'Company' && customerDetails ? {
        organizationNumber: customerDetails.organizationNumber,
        companyName: customerDetails.companyName,
        streetAddress: customerDetails.streetAddress,
        city: customerDetails.city,
        postalCode: customerDetails.postalCode,
      } : {}),

      // Private individual specific fields
      ...(form.customerType === 'Private Individual' && customerDetails ? {
        customerName: customerDetails.customerName,
        legalId: customerDetails.legalId,
        street: customerDetails.street,
        zip: customerDetails.zip,
      } : {}),

      telephoneNumber: form.telephoneNumber,

      // Trade-in Vehicle Information
      tradeInVehicle: form.tradeInVehicle,
      tradeInRegistrationNumber: form.tradeInRegistrationNumber,
      tradeInPurchaseDate: form.tradeInPurchaseDate,
      tradeInPurchasePrice: form.tradeInPurchasePrice,
      tradeInMileage: form.tradeInMileage,
      tradeInCreditMarking: form.tradeInCreditMarking,
      tradeInCreditor: form.tradeInCreditor,
      tradeInCreditAmount: form.tradeInCreditAmount,
      tradeInVehicleDetails: this.tradeInVehicleDetails,

      // Common fields
      salesPrice: form.salesPrice,
      paymentMethod: form.paymentMethod,
      vatType: form.vatType,
      mileage: form.mileage,
      numberOfKeys: form.numberOfKeys,
      deck: form.deck,
      insurer: form.insurer,
      insuranceType: form.insuranceType,
      warrantyProvider: form.warrantyProvider,
      warrantyProduct: form.warrantyProduct,
      freeTextPayment: form.freeTextPayment,

      // Financing fields
      creditor: form.creditor,
      creditAmount: form.creditAmount,
      cashBet: form.cashBet,
      loanPeriod: form.loanPeriod,

      // Leasing fields
      leasingProvider: form.leasingProvider,
      leasingAmount: form.leasingAmount,
      leasingPeriod: form.leasingPeriod,

      // Seller Information
      seller: sellerInfo,
      vehicleDetails: this.vehicleDetails,
    };

    return previewData;
  }

  // Helper method to get error message for a form control
  getErrorMessage(form: FormGroup, controlName: string): string {
    const control = form.get(controlName);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    
    // Specific error messages for different fields
    switch(controlName) {
      case 'registrationNumber':
        if (errors['required']) return 'Registration number is required';
        break;
      
      case 'salesDate':
        if (errors['required']) return 'Sales date is required';
        break;
      
      case 'customerType':
        if (errors['required']) return 'Please select a customer type';
        break;
      
      case 'organizationNumber':
        if (errors['required']) return 'Organization number is required';
        if (errors['pattern']) return 'Invalid organization number format';
        break;
      
      case 'socialSecurityNumber':
        if (errors['required']) return 'Social security number is required';
        if (errors['pattern']) return 'Invalid social security number format (YYYYMMDD-XXXX)';
        break;
      
      case 'emailAddress':
        if (errors['required']) return 'Email address is required';
        if (errors['email'] || errors['invalidEmail']) return 'Please enter a valid email address';
        break;
      
      case 'telephoneNumber':
        if (errors['required']) return 'Telephone number is required';
        break;

      // Sales Information Fields
      case 'salesPrice':
        if (errors['required']) return 'Sales price is required';
        if (errors['min']) return `Minimum sales price is ${errors['min'].min}`;
        break;
      
      case 'paymentMethod':
        if (errors['required']) return 'Please select a payment method';
        break;

      // Financing Fields
      case 'creditor':
        if (errors['required']) return 'Creditor is required';
        break;
      
      case 'creditAmount':
        if (errors['required']) return 'Credit amount is required';
        if (errors['min']) return `Minimum credit amount is ${errors['min'].min}`;
        break;
      
      case 'cashBet':
        if (errors['required']) return 'Cash bet percentage is required';
        break;
      
      case 'loanPeriod':
        if (errors['required']) return 'Loan period is required';
        if (errors['min']) return `Minimum loan period is ${errors['min'].min} months`;
        if (errors['max']) return `Maximum loan period is ${errors['max'].max} months`;
        break;

      // Leasing Fields
      case 'leasingProvider':
        if (errors['required']) return 'Leasing provider is required';
        break;
      
      case 'leasingAmount':
        if (errors['required']) return 'Leasing amount is required';
        if (errors['min']) return `Minimum leasing amount is ${errors['min'].min}`;
        break;
      
      case 'leasingPeriod':
        if (errors['required']) return 'Leasing period is required';
        if (errors['min']) return `Minimum leasing period is ${errors['min'].min} months`;
        if (errors['max']) return `Maximum leasing period is ${errors['max'].max} months`;
        break;

      // Vehicle Information Fields
      case 'vatType':
        if (errors['required']) return 'VAT type is required';
        break;
      
      case 'mileage':
        if (errors['required']) return 'Mileage is required';
        if (errors['min']) return `Minimum mileage is ${errors['min'].min} km`;
        if (errors['max']) return `Maximum mileage is ${errors['max'].max} km`;
        break;
      
      case 'numberOfKeys':
        if (errors['required']) return 'Number of keys is required';
        break;
      
      case 'deck':
        if (errors['required']) return 'Tire type is required';
        break;
      
      case 'insuranceType':
        if (errors['required']) return 'Insurance type is required';
        break;
    }
    
    // Generic fallback error messages
    if (errors['required']) return 'This field is required';
    if (errors['minlength']) return `Minimum length is ${errors['minlength'].requiredLength} characters`;
    if (errors['maxlength']) return `Maximum length is ${errors['maxlength'].requiredLength} characters`;
    if (errors['pattern']) return 'Invalid format';
    if (errors['min']) return `Minimum value is ${errors['min'].min}`;
    if (errors['max']) return `Maximum value is ${errors['max'].max}`;

    return 'Invalid input';
  }

  // For backward compatibility with the HTML template
  get step1Form() { return this.agreementForm; }
  get step2Form() { return this.agreementForm; }
  get step3Form() { return this.agreementForm; }

  // Add getter for financing fields visibility
  get showFinancingFields(): boolean {
    const paymentMethod = this.agreementForm.get('paymentMethod')?.value;
    return paymentMethod === 'Financing with Down Payment' || 
           paymentMethod === 'Financing without Down Payment';
  }

  get showLeasingFields(): boolean {
    return this.agreementForm.get('paymentMethod')?.value === 'Leasing';
  }

  get showCashBetField(): boolean {
    return this.agreementForm.get('paymentMethod')?.value === 'Financing with Down Payment';
  }

  // Add getter for cash bet options
  get cashBetOptions(): number[] {
    return Array.from({length: 20}, (_, i) => (i + 1) * 5);
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control instanceof FormControl) {
        control.markAsTouched({ onlySelf: true });
      } else if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onCancel() {
    this.router.navigate(['/agreements']);
  }

  // Method to log form errors for debugging
  private logFormErrors(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control instanceof FormControl) {
        console.log(`${field} errors:`, control.errors);
      } else if (control instanceof FormGroup) {
        this.logFormErrors(control);
      }
    });
  }

  // Method to get detailed form validation errors
  private getFormValidationErrors(): { [key: string]: any } {
    const errors: { [key: string]: any } = {};
    
    Object.keys(this.agreementForm.controls).forEach(field => {
      const control = this.agreementForm.get(field);
      if (control instanceof FormControl && control.errors) {
        errors[field] = control.errors;
      }
    });
    
    return errors;
  }

  // Manually added method to handle numeric input formatting
  formatNumber(event: Event, field: string) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const formattedValue = value.replace(/[^0-9.]/g, '');
    input.value = formattedValue;
  }

  // New method to load agreement for editing
  private loadAgreementForEdit() {
    if (!this.agreementId) return;

    this.agreementService.getAgreementDetails(this.agreementId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.populateFormForEdit(response.data);
        } else {
          this.toastr.error('Failed to load agreement details');
          this.router.navigate(['/dashboard/agreements']);
        }
      },
      error: (error) => {
        console.error('Error loading agreement:', error);
        this.toastr.error('Failed to load agreement details');
        this.router.navigate(['/dashboard/agreements']);
      }
    });
  }

  // New method to populate form with existing agreement data
  private populateFormForEdit(agreementData: any) {
    // Ensure we have sales details
    const salesDetails = agreementData.sales_details || {};
    const vehicleDetails = agreementData.vehicle_id || agreementData.vehicle_details || {};
    
    // Determine customer details based on customerType
    let customerDetails: any = null;
    if (agreementData.customerType === 'Company') {
      // Try multiple paths for company details
      customerDetails = 
        agreementData.organization_detail || 
        agreementData.customer_id?.company_details || 
        agreementData.sales_details?.organization_detail;
    } else {
      // Try multiple paths for person details
      customerDetails = 
        agreementData.person_detail || 
        agreementData.customer_id?.person_details;
    }

    // Patch form with loaded data
    const formPatch: any = {
      // Basic Information
      registrationNumber: salesDetails.registrationNumber || agreementData.registrationNumber,
      salesDate: salesDetails.salesDate,
      customerType: agreementData.customerType,
      emailAddress: salesDetails.emailAddress || agreementData.emailAddress,
      telephoneNumber: salesDetails.telephoneNumber || agreementData.telephoneNumber,

      // Sales Information
      salesPrice: salesDetails.salesPrice,
      paymentMethod: salesDetails.paymentMethod,
      vatType: salesDetails.vatType,
      mileage: salesDetails.mileage,
      numberOfKeys: salesDetails.numberOfKeys,
      deck: salesDetails.deck,
      insurer: salesDetails.insurer,
      insuranceType: salesDetails.insuranceType,
      warrantyProvider: salesDetails.warrantyProvider,
      warrantyProduct: salesDetails.warrantyProduct,
      freeTextPayment: salesDetails.freeTextPayment
    };

    // Populate customer-specific details
    if (agreementData.customerType === 'Company') {
      formPatch.organizationNumber = 
        customerDetails?.organization_number || 
        customerDetails?.organizationNumber || 
        agreementData.organizationNumber;
      formPatch.companyName = 
        customerDetails?.corp_name || 
        customerDetails?.companyName || 
        customerDetails?.name;
      formPatch.streetAddress = 
        customerDetails?.street_address || 
        customerDetails?.streetAddress;
      formPatch.city = 
        customerDetails?.city || 
        customerDetails?.registered_city;
      formPatch.postalCode = 
        customerDetails?.postal_code || 
        customerDetails?.postalCode;
    } else {
      // Populate person details
      if (customerDetails) {
        formPatch.customerName = 
          (customerDetails.name?.givenName && customerDetails.name?.lastName) 
            ? `${customerDetails.name.givenName} ${customerDetails.name.lastName}` 
            : customerDetails.name;
        formPatch.socialSecurityNumber = 
          customerDetails.legalId || 
          customerDetails.socialSecurityNumber;
        
        // Populate address if available
        if (customerDetails.addresses && customerDetails.addresses.length > 0) {
          const address = customerDetails.addresses[0];
          formPatch.street = 
            `${address.street || ''} ${address.number || ''}`.trim();
          formPatch.zip = address.zip || address.postal_code;
        }
      }
    }

    // Populate trade-in vehicle details if applicable
    if (salesDetails.tradeInVehicle) {
      formPatch.tradeInVehicle = 'Yes';
      formPatch.tradeInRegistrationNumber = salesDetails.tradeInVehicle.registrationNumber;
      formPatch.tradeInPurchaseDate = salesDetails.tradeInVehicle.purchaseDate;
      formPatch.tradeInPurchasePrice = salesDetails.tradeInVehicle.purchasePrice;
      formPatch.tradeInMileage = salesDetails.tradeInVehicle.mileage;
      formPatch.tradeInCreditMarking = salesDetails.tradeInVehicle.creditMarking;
      
      if (salesDetails.tradeInVehicle.creditMarking === 'Yes') {
        formPatch.tradeInCreditor = salesDetails.tradeInVehicle.creditor;
        formPatch.tradeInCreditAmount = salesDetails.tradeInVehicle.creditAmount;
      }
    }

    // Populate financing or leasing details
    if (salesDetails.financing) {
      formPatch.creditor = salesDetails.financing.creditor;
      formPatch.creditAmount = salesDetails.financing.creditAmount;
      formPatch.loanPeriod = salesDetails.financing.loanPeriod;
      formPatch.cashBet = salesDetails.financing.cashBet;
    }

    if (salesDetails.leasing) {
      formPatch.leasingProvider = salesDetails.leasing.provider;
      formPatch.leasingAmount = salesDetails.leasing.amount;
      formPatch.leasingPeriod = salesDetails.leasing.period;
    }

    // Set vehicle details for later use
    this.vehicleDetails = vehicleDetails;
    this.vehicleSearched = true;

    // Patch the form
    this.agreementForm.patchValue(formPatch);

    // Optional: Log for debugging
    console.log('Populated Form Patch:', formPatch);
  }
}
