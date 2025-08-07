import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AgreementService } from '../../../shared/service/agreement/agreement.service';
import { VehicleService } from '../../../shared/service/vehicle/vehicle.service';
import { LoggingService } from '../../../shared/service/logging.service';
import { 
  CorporationService, 
  OrgSearchResponse,
  ApiResponse,
  CurrentCorporationResponse
} from '../../../shared/service/corporation/corporation.service';
import { CustomerService } from '../../../shared/service/customer/customer.service';
import { AuthService } from '../../../shared/service/Auth/Auth.service';

// Response interfaces
interface CustomerSearchResponse {
  _type?: string;
  id?: string;
  country?: string;
  legalId?: string;
  birthDate?: string;
  gender?: string;
  name?: {
    country?: string;
    names?: string[];
    lastName?: string;
    givenName?: string;
  };
  addresses?: Array<{
    _type?: string;
    kind?: string;
    country?: string;
    street?: string;
    number?: string;
    numberSuffix?: string;
    flat?: string;
    zip?: string;
    city?: string;
    county?: string;
    municipality?: string;
    id?: string;
  }>;
}

// Interface for agency information
interface AgencyInfo {
  name: string;
  organizationName: string;
  organizationNumber: string;
  email: string;
  phone: string;
  address: string;
  businessCategory: string;
  legalForm: string;
}

// Interface for agency agreement data
export interface AgencyAgreementData {
  // Basic Information
  registrationNumber: string;
  agencyDate: string;
  customerType: string;
  emailAddress: string;
  
  // Company Information
  organizationNumber?: string;
  companyName?: string;
  streetAddress?: string;
  city?: string;
  postalCode?: string;
  contactPerson?: string;
  businessCategory?: string;
  legalForm?: string;

  // Private Individual Information
  telephoneNumber?: string;
  customerName?: string;
  legalId?: string;
  street?: string;
  zip?: string;

  // Vehicle Information
  mileage: string;
  latestService: string;
  numberOfKeys: string;
  deck: string;

  // Agency Information
  salesPrice: string;
  commissionRate: string;
  commissionAmount: string;
  agencyFee: string;
  paymentMethod: string;
  vatType: string;
  notes?: string;

  // Agency Information
  agency: AgencyInfo;
}

@Component({
  selector: 'app-agency-agreement',
  templateUrl: './agency-agreement.component.html'
})
export class AgencyAgreementComponent implements OnInit {
  title = 'Agency Agreement';

  // Form state
  submitting = false;
  submittingAndSigning = false;

  // Vehicle search state
  vehicleSearching = false;
  vehicleSearched = false;
  vehicleDetails: any = null;
  showVehicleDetailsModal = false;

  // Organization search state
  orgSearchLoading = false;
  orgSearched = false;
  orgError: string | null = null;

  // Person search state
  personSearchLoading = false;

  // Form group
  agencyForm: FormGroup;

  // Agency info
  agencyInfo: AgencyInfo | null = null;

  // Edit mode properties
  isEditMode = false;
  agreementId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private agreementService: AgreementService,
    private vehicleService: VehicleService,
    private loggingService: LoggingService,
    private corporationService: CorporationService,
    private customerService: CustomerService,
    private authService: AuthService
  ) {
    this.agencyForm = this.fb.group({
      // Basic Information
      registrationNumber: ['', [Validators.required]],
      agencyDate: ['', [Validators.required]],
      customerType: ['', [Validators.required]],
      emailAddress: ['', [Validators.required, Validators.email]],
      telephoneNumber: [''],

      // Company Information
      organizationNumber: [''],
      companyName: [''],
      streetAddress: [''],
      city: [''],
      postalCode: [''],
      contactPerson: [''],
      businessCategory: [''],
      legalForm: [''],

      // Private Individual Information
      socialSecurityNumber: [''],
      customerName: [''],
      legalId: [''],
      street: [''],
      zip: [''],

      // Vehicle Information
      mileage: ['', [Validators.required]],
      latestService: ['', [Validators.required]],
      numberOfKeys: ['', [Validators.required]],
      deck: ['', [Validators.required]],

      // Agency Information
      salesPrice: ['', [Validators.required]],
      commissionRate: ['', [Validators.required]],
      commissionAmount: ['', [Validators.required]],
      agencyFee: ['', [Validators.required]],
      paymentMethod: ['', [Validators.required]],
      vatType: ['', [Validators.required]],
      notes: ['']
    });

    // Subscribe to customer type changes
    this.agencyForm.get('customerType')?.valueChanges.subscribe(type => {
      const orgNumberControl = this.agencyForm.get('organizationNumber');
      const ssnControl = this.agencyForm.get('socialSecurityNumber');
      
      if (type === 'Company') {
        orgNumberControl?.setValidators([Validators.required]);
        ssnControl?.clearValidators();
        ssnControl?.setValue('');
      } else if (type === 'Private Individual') {
        ssnControl?.setValidators([Validators.required]);
        orgNumberControl?.clearValidators();
        orgNumberControl?.setValue('');
      }
      
      orgNumberControl?.updateValueAndValidity();
      ssnControl?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    // Check if we're in edit mode
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state;

    // Try to get ID from route params first
    const routeId = this.route.snapshot.paramMap.get('id');

    if (routeId) {
      this.isEditMode = true;
      this.agreementId = routeId;
      this.loadAgreementForEdit();
    } else if (state && state['editMode'] && state['agreementId']) {
      this.isEditMode = true;
      this.agreementId = state['agreementId'];
      this.loadAgreementForEdit();
    } else {
      this.populateBuyerDetails();
    }
  }

  private populateBuyerDetails() {
    this.authService.getUserDetails().subscribe(user => {
      if (user) {
        // Update the agency info with current user's organization details
        this.agencyInfo = {
          name: user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}` 
            : user.organization?.contact_person || '',
          organizationName: user.organization?.organization_name || user.corp?.corp_name || '',
          organizationNumber: user.organization?.organization_number || '',
          email: user.organization?.company_email || user.email || '',
          phone: user.organization?.company_phone || user.mobile || '',
          address: user.organization?.company_address || '',
          businessCategory: user.organization?.business_category || '',
          legalForm: user.organization?.legal_form || ''
        };
        
        // Log the loaded agency info for debugging
        console.log('Loaded buyer agency info:', this.agencyInfo);
        
        // Update the preview by triggering change detection
        this.agencyForm.updateValueAndValidity();
      }
    });
  }

  private loadAgreementForEdit() {
    // Show loading indicator
    this.submitting = true;

    // Explicitly check for agreementId
    if (!this.agreementId) {
      console.error('No agreement ID found');
      this.toastr.error('Failed to load agreement: No ID provided');
      this.router.navigate(['/dashboard/agreements']);
      return;
    }

    console.log('Loading agreement details for ID:', this.agreementId);

    this.agreementService.getAgreementDetails(this.agreementId).subscribe({
      next: (response) => {
        this.submitting = false;
        console.log('Agreement Details Response:', response);
        if (response.success && response.data) {
          this.populateFormForEdit(response.data);
        } else {
          console.error('Failed to load agreement details:', response);
          this.toastr.error(response.message || 'Failed to load agreement details');
          this.router.navigate(['/dashboard/agreements']);
        }
      },
      error: (error) => {
        this.submitting = false;
        console.error('Error loading agreement details:', error);
        this.toastr.error(error.error?.message || 'Failed to load agreement details');
        this.router.navigate(['/dashboard/agreements']);
      }
    });
  }

  private populateFormForEdit(agreement: any) {
    console.log('Populating form with agreement:', agreement);

    // Determine the correct source for customer details
    const customerDetails = agreement.customer_id?.company_details || 
                            agreement.agency_details?.seller?.organization_detail || 
                            {};

    console.log('Customer Details:', customerDetails);

    // Set form values based on agreement type
    const formValues = {
      // Basic Information
      registrationNumber: agreement.registrationNumber || agreement.agency_details?.registrationNumber || '',
      agencyDate: this.formatDateForInput(agreement.agency_details?.agencyDate),
      customerType: agreement.customerType || '',
      emailAddress: agreement.emailAddress || '',
      telephoneNumber: agreement.telephoneNumber || '',

      // Company specific fields
      organizationNumber: customerDetails.organization_number || 
                          customerDetails.organization_number || 
                          agreement.agency_details?.buyer?.organizationNumber || '',
      companyName: customerDetails.corp_name || 
                   customerDetails.corp_name || 
                   agreement.agency_details?.buyer?.organizationName || '',
      streetAddress: customerDetails.street_address || 
                     customerDetails.street_address || 
                     agreement.agency_details?.buyer?.address?.split(',')[0] || '',
      city: customerDetails.city || 
            customerDetails.city || 
            agreement.agency_details?.buyer?.address?.split(',')[1]?.trim() || '',
      postalCode: customerDetails.postal_code || '',
      contactPerson: customerDetails.contact_person || 
                     agreement.agency_details?.buyer?.name || '',
      businessCategory: customerDetails.business_category || 
                        agreement.agency_details?.buyer?.businessCategory || '',
      legalForm: customerDetails.legal_form || 
                 agreement.agency_details?.buyer?.legalForm || '',

      // Vehicle Information
      mileage: agreement.agency_details?.mileage || '',
      latestService: this.formatDateForInput(agreement.agency_details?.latestService),
      numberOfKeys: agreement.agency_details?.numberOfKeys || '',
      deck: agreement.agency_details?.deck || '',

      // Agency Information
      salesPrice: agreement.agency_details?.salesPrice || '',
      commissionRate: agreement.agency_details?.commissionRate || '',
      commissionAmount: agreement.agency_details?.commissionAmount || '',
      agencyFee: agreement.agency_details?.agencyFee || '',
      paymentMethod: agreement.agency_details?.paymentMethod || '',
      vatType: agreement.agency_details?.vatType || '',
      notes: agreement.agency_details?.notes || ''
    };

    console.log('Form Values:', formValues);

    // Patch form values
    this.agencyForm.patchValue(formValues);

    // Trigger validation updates
    this.agencyForm.updateValueAndValidity();

    // Populate agency info
    this.agencyInfo = {
      name: agreement.agency_details?.buyer?.name || '',
      organizationName: agreement.agency_details?.buyer?.organizationName || customerDetails.corp_name || '',
      organizationNumber: agreement.agency_details?.buyer?.organizationNumber || customerDetails.organization_number || '',
      email: agreement.agency_details?.buyer?.email || agreement.emailAddress || '',
      phone: agreement.agency_details?.buyer?.phone || agreement.telephoneNumber || '',
      address: agreement.agency_details?.buyer?.address || 
               (customerDetails.street_address ? 
                `${customerDetails.street_address}, ${customerDetails.city} ${customerDetails.postal_code}` : ''),
      businessCategory: agreement.agency_details?.buyer?.businessCategory || customerDetails.business_category || '',
      legalForm: agreement.agency_details?.buyer?.legalForm || customerDetails.legal_form || ''
    };

    console.log('Agency Info:', this.agencyInfo);
  }

  // Helper method to format date for input field
  private formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  // Vehicle Search Logic
  searchVehicle() {
    const registrationNumber = this.agencyForm.get('registrationNumber')?.value;
    if (!registrationNumber) {
      this.toastr.error('Please enter a registration number');
      this.vehicleSearched = false;
      return;
    }
    this.vehicleSearching = true;
    this.vehicleSearched = false;
    this.vehicleDetails = null;
    this.vehicleService.searchVehicleByRegistration(registrationNumber).subscribe({
      next: (response) => {
        this.vehicleSearching = false;
        if (response.success && response.data) {
          this.vehicleSearched = true;
          this.vehicleDetails = response.data;
          this.toastr.success('Vehicle found successfully');
          this.autoFillVehicleDetails();
        } else {
          this.vehicleSearched = false;
          this.vehicleDetails = null;
          this.toastr.error(response.message || 'Vehicle not found');
        }
      },
      error: (error) => {
        this.vehicleSearching = false;
        this.vehicleSearched = false;
        this.vehicleDetails = null;
        this.toastr.error('Failed to search vehicle');
      }
    });
  }

  // Auto-fill vehicle details
  autoFillVehicleDetails() {
    if (!this.vehicleDetails) return;

    const detail = this.vehicleDetails.detail || {};
    const inspection = this.vehicleDetails.inspection || {};

    const formValues = {
      mileage: inspection.mileage?.toString() || '',
      numberOfKeys: detail.numberOfKeys?.toString() || '',
      deck: detail.deck || ''
    };

    this.agencyForm.patchValue(formValues);
  }

  // Organization Search Logic
  publicSearchOrganization() {
    const orgNumber = this.agencyForm.get('organizationNumber')?.value;
    if (!orgNumber) {
      this.toastr.error('Please enter an organization number');
      return;
    }
    this.orgSearchLoading = true;
    this.orgError = null;
    this.corporationService.publicSearchOrganization(orgNumber).subscribe({
      next: (response) => {
        this.orgSearchLoading = false;
        if (response.success && response.data) {
          this.orgSearched = true;
          this.toastr.success('Organization found successfully');
          this.patchCompanyFields(response.data);
        } else {
          this.orgError = response.message || 'Organization not found';
          this.toastr.error(this.orgError);
        }
      },
      error: (error) => {
        this.orgSearchLoading = false;
        this.orgError = 'Failed to search organization';
        this.toastr.error(this.orgError);
      }
    });
  }

  // Person Search Logic
  searchPerson() {
    const ssn = this.agencyForm.get('socialSecurityNumber')?.value;
    if (!ssn) {
      this.toastr.error('Please enter a social security number');
      return;
    }
    this.personSearchLoading = true;
    this.customerService.searchBySSN(ssn).subscribe({
      next: (response: ApiResponse<CustomerSearchResponse>) => {
        this.personSearchLoading = false;
        if (response.success && response.data) {
          this.toastr.success('Person found successfully');
          this.patchPersonFields(response.data);
        } else {
          this.toastr.error(response.message || 'Person not found');
        }
      },
      error: (error: Error) => {
        this.personSearchLoading = false;
        this.toastr.error('Failed to search person');
      }
    });
  }

  // Patch company fields
  patchCompanyFields(data: any) {
    this.agencyForm.patchValue({
      companyName: data.corp_name || '',
      streetAddress: data.street_address || '',
      city: data.city || data.registered_city || '',
      postalCode: data.postal_code || '',
      emailAddress: data.company_email || this.agencyForm.get('emailAddress')?.value || '',
      telephoneNumber: data.company_phone?.number || data.company_phone || this.agencyForm.get('telephoneNumber')?.value || '',
      organizationNumber: data.organization_number || this.agencyForm.get('organizationNumber')?.value || ''
    });
  }

  // Patch person fields
  patchPersonFields(data: CustomerSearchResponse) {
    const address = data.addresses?.[0] || {};
    const fullName = data.name ? `${data.name.givenName} ${data.name.lastName}` : data.name || '';
    
    this.agencyForm.patchValue({
      customerName: fullName,
      legalId: data.legalId || '',
      street: address.street || '',
      city: address.city || '',
      zip: address.zip || '',
      emailAddress: this.agencyForm.get('emailAddress')?.value || '',
      telephoneNumber: this.agencyForm.get('telephoneNumber')?.value || ''
    });
  }

  // Modal methods
  openVehicleDetailsModal() {
    if (this.vehicleDetails) {
      this.showVehicleDetailsModal = true;
    }
  }

  closeVehicleDetailsModal() {
    this.showVehicleDetailsModal = false;
  }

  // Navigation methods
  goBack() {
    this.router.navigate(['/dashboard/agreements']);
  }

  // Format date
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

  // Preview getter
  get preview() {
    const form = this.agencyForm.getRawValue();
    return {
      ...form,
      agency: this.agencyInfo,
      salesPrice: form.salesPrice,
      commissionRate: form.commissionRate,
      commissionAmount: form.commissionAmount,
      agencyFee: form.agencyFee,
      paymentMethod: form.paymentMethod,
      vatType: form.vatType,
      notes: form.notes,
      vehicleDetails: this.vehicleDetails
    };
  }

  // Modify onSubmit to handle both create and update
  onSubmit() {
    if (this.agencyForm.invalid) {
      this.toastr.error('Please fill in all required fields');
      return;
    }

    this.submitting = true;
    const formData = this.agencyForm.getRawValue();
    
    // Prepare data according to new structure
    const payload = {
      customerType: formData.customerType,
      emailAddress: formData.emailAddress,
      telephoneNumber: formData.telephoneNumber || '',
      
      // Add organization or person details based on customer type
      ...(formData.customerType === 'Company' ? {
        organization_detail: {
          organization_number: formData.organizationNumber,
          corp_name: formData.companyName,
          street_address: formData.streetAddress,
          city: formData.city,
          postal_code: formData.postalCode,
          contact_person: formData.contactPerson,
          business_category: formData.businessCategory,
          legal_form: formData.legalForm
        }
      } : {
        person_detail: {
          legal_id: formData.socialSecurityNumber,
          customer_name: formData.customerName,
          street: formData.street,
          zip: formData.zip,
          city: formData.city
        }
      }),

      // Agency details
      agency_details: {
        registrationNumber: formData.registrationNumber,
        agencyDate: formData.agencyDate,
        mileage: formData.mileage,
        latestService: formData.latestService,
        numberOfKeys: formData.numberOfKeys,
        deck: formData.deck,
        salesPrice: formData.salesPrice,
        commissionRate: formData.commissionRate,
        commissionAmount: formData.commissionAmount,
        agencyFee: formData.agencyFee,
        paymentMethod: formData.paymentMethod,
        vatType: formData.vatType,
        notes: formData.notes || '',
        buyer: this.agencyInfo // Current organization details
      }
    };

    // Determine whether to create or update
    if (this.isEditMode && this.agreementId) {
      // Update existing agreement
      this.agreementService.updateAgencyAgreement(this.agreementId, payload).subscribe({
        next: (response) => {
          this.submitting = false;
          this.toastr.success('Agency agreement updated successfully');
          this.router.navigate(['/dashboard/agreements']);
        },
        error: (error) => {
          this.submitting = false;
          this.toastr.error(error.error?.message || 'Failed to update agency agreement');
        }
      });
    } else {
      // Create new agreement
      this.agreementService.createAgencyAgreement(payload).subscribe({
        next: (response) => {
          this.submitting = false;
          this.toastr.success('Agency agreement created successfully');
          this.router.navigate(['/dashboard/agreements']);
        },
        error: (error) => {
          this.submitting = false;
          this.toastr.error(error.error?.message || 'Failed to create agency agreement');
        }
      });
    }
  }

  // Modify onSubmitAndSign to handle both create and update
  onSubmitAndSign() {
    if (this.agencyForm.invalid) {
      this.toastr.error('Please fill in all required fields');
      return;
    }

    this.submittingAndSigning = true;
    const formData = this.agencyForm.getRawValue();
    
    // Prepare data according to new structure
    const payload = {
      customerType: formData.customerType,
      emailAddress: formData.emailAddress,
      telephoneNumber: formData.telephoneNumber || '',
      
      // Add organization or person details based on customer type
      ...(formData.customerType === 'Company' ? {
        organization_detail: {
          organization_number: formData.organizationNumber,
          corp_name: formData.companyName,
          street_address: formData.streetAddress,
          city: formData.city,
          postal_code: formData.postalCode,
          contact_person: formData.contactPerson,
          business_category: formData.businessCategory,
          legal_form: formData.legalForm
        }
      } : {
        person_detail: {
          legal_id: formData.socialSecurityNumber,
          customer_name: formData.customerName,
          street: formData.street,
          zip: formData.zip,
          city: formData.city
        }
      }),

      // Agency details
      agency_details: {
        registrationNumber: formData.registrationNumber,
        agencyDate: formData.agencyDate,
        mileage: formData.mileage,
        latestService: formData.latestService,
        numberOfKeys: formData.numberOfKeys,
        deck: formData.deck,
        salesPrice: formData.salesPrice,
        commissionRate: formData.commissionRate,
        commissionAmount: formData.commissionAmount,
        agencyFee: formData.agencyFee,
        paymentMethod: formData.paymentMethod,
        vatType: formData.vatType,
        notes: formData.notes || '',
        buyer: this.agencyInfo // Current organization details
      }
    };

    // Determine whether to create and sign or update and sign
    if (this.isEditMode && this.agreementId) {
      // Update and sign existing agreement
      this.agreementService.createAndSignAgencyAgreement(payload).subscribe({
        next: (response) => {
          this.submittingAndSigning = false;
          this.toastr.success('Agency agreement updated and signed successfully');
          const agreementId = response.data?.agreement_id || response.data?._id || this.agreementId;
          if (agreementId) {
            this.router.navigate(['/sign', agreementId]);
          } else {
            this.router.navigate(['/dashboard/agreements']);
          }
        },
        error: (error) => {
          this.submittingAndSigning = false;
          this.toastr.error(error.error?.message || 'Failed to update and sign agency agreement');
        }
      });
    } else {
      // Create and sign new agreement
      this.agreementService.createAndSignAgencyAgreement(payload).subscribe({
        next: (response) => {
          this.submittingAndSigning = false;
          this.toastr.success('Agency agreement created and signed successfully');
          const agreementId = response.data?.agreement_id || response.data?._id;
          if (agreementId) {
            this.router.navigate(['/sign', agreementId]);
          } else {
            this.router.navigate(['/dashboard/agreements']);
          }
        },
        error: (error) => {
          this.submittingAndSigning = false;
          this.toastr.error(error.error?.message || 'Failed to create and sign agency agreement');
        }
      });
    }
  }

  formatNumber(event: Event, field: string) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const formattedValue = value.replace(/[^0-9.]/g, '');
    input.value = formattedValue;
  }
}
