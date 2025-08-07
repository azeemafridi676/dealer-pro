import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AgreementService, NewPurchaseAgreementPayload } from '../../../shared/service/agreement/agreement.service';
import { VehicleService } from '../../../shared/service/vehicle/vehicle.service';
import { LoggingService } from '../../../shared/service/logging.service';
import { CorporationService, OrgSearchResponse } from '../../../shared/service/corporation/corporation.service';
import { CustomerService } from '../../../shared/service/customer/customer.service';
import { AuthService } from '../../../shared/service/Auth/Auth.service';

// Interface for Corporation (matching the actual properties from the service)
interface Corporation {
  contactPerson: string;
  corporationName: string;
  organizationNumber: string;
  email: string;
  phone: string;
  address: string;
  businessCategory: string;
  legalForm: string;
}

// Interface for buyer information
interface BuyerInfo {
  name: string;
  corp_id: string;
  organizationName?: string;
  organizationNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  businessCategory?: string;
  legalForm?: string;
}

@Component({
  selector: 'app-purchase-agreement',
  templateUrl: './purchase-agreement.component.html'
})
export class PurchaseAgreementComponent implements OnInit {
  title = 'Purchase Agreement';

  // Form state
  submitting = false;
  submittingAndSigning = false;

  // Vehicle search properties
  vehicleSearching = false;
  vehicleSearched = false;
  vehicleDetails: any = null;
  showVehicleDetailsModal = false;
  showCreditMarkingFields = false;
  // Organization search properties
  buyerOrgSearchLoading = false;
  buyerOrgSearched = false;
  buyerOrgError: string | null = null;

  // Person search properties
  personSearchLoading = false;

  // Form
  purchaseForm: FormGroup;

  // Add buyer information
  buyerInfo: BuyerInfo | null = null;

  personData: any = null;

  // Add SOURCE constant
  private readonly SOURCE = 'PurchaseAgreementComponent';

  // Add these properties
  isEditMode = false;
  agreementId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastr: ToastrService,
    private agreementService: AgreementService,
    private vehicleService: VehicleService,
    private loggingService: LoggingService,
    private corporationService: CorporationService,
    private customerService: CustomerService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {
    this.purchaseForm = this.fb.group({
      // Basic Information
      registrationNumber: ['', [Validators.required]],
      purchaseDate: ['', [Validators.required]],
      customerType: ['', [Validators.required]],
      emailAddress: ['', [Validators.required, Validators.email, this.customEmailValidator]],
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

      // Purchase Information
      purchasePrice: ['', [Validators.required]],
      paymentMethod: ['', [Validators.required]],
      vatType: ['', [Validators.required]],
      creditMarking: ['', [Validators.required]],
      creditorName: ['', [Validators.required]],
      creditAmount: ['', [Validators.required]],
      depositor: ['', [Validators.required]],
     

      // Vehicle Information
      mileage: ['', [Validators.required]],
      latestService: ['', [Validators.required]],
      numberOfKeys: ['', [Validators.required, this.nonEmptySelectValidator]],
      deck: ['', [Validators.required, this.nonEmptySelectValidator]],
      notes: ['']
    });

    // Dynamic validation for customer type
    this.purchaseForm.get('customerType')?.valueChanges.subscribe(type => {
      const orgNumberControl = this.purchaseForm.get('organizationNumber');
      const ssnControl = this.purchaseForm.get('socialSecurityNumber');
      
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

    // Add credit marking change subscription
    this.purchaseForm.get('creditMarking')?.valueChanges.subscribe(value => {
      const creditMarkingControls = ['creditorName', 'creditAmount', 'depositor'];
      
      if (value === 'Yes') {
        creditMarkingControls.forEach(control => {
          this.purchaseForm.get(control)?.setValidators([Validators.required]);
        });
      } else {
        creditMarkingControls.forEach(control => {
          this.purchaseForm.get(control)?.clearValidators();
          this.purchaseForm.get(control)?.setValue('');
        });
      }
      
      creditMarkingControls.forEach(control => {
        this.purchaseForm.get(control)?.updateValueAndValidity();
      });
    });

    // Load buyer (company) information
    this.loadBuyerInfo();

    this.populateSellerDetails();
  }

  ngOnInit(): void {
    const today = new Date().toISOString().split('T')[0];
    this.purchaseForm.patchValue({
      purchaseDate: today
    });

    // Check if we're in edit mode
    this.route.params.subscribe(params => {
      this.agreementId = params['id'];
      this.isEditMode = !!this.agreementId;

      if (this.isEditMode) {
        this.loadAgreementForEdit();
      }
    });
  }

  // Custom email validator
  private customEmailValidator(control: AbstractControl) {
    const value = control.value;
    if (!value) return null;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) {
      return { 
        invalidEmail: true,
        message: 'Please enter a valid email address (e.g., example@domain.com)'
      };
    }
    return null;
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

  // Search vehicle by registration number
  searchVehicle() {
    const registrationNumber = this.purchaseForm.get('registrationNumber')?.value;
    
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

  // Auto-fill vehicle details from search
  autoFillVehicleDetails() {
    if (!this.vehicleDetails) return;

    const detail = this.vehicleDetails.detail || {};
    const inspection = this.vehicleDetails.inspection || {};

    const formValues = {
      mileage: inspection.mileage?.toString() || '',
      numberOfKeys: detail.numberOfKeys?.toString() || '',
      deck: detail.deck || ''
    };

    this.purchaseForm.patchValue(formValues);
  }

  // Search organization
  publicSearchOrganization() {
    const orgNumber = this.purchaseForm.get('organizationNumber')?.value;
    if (!orgNumber) {
      this.toastr.error('Please enter an organization number');
      return;
    }

    this.buyerOrgSearchLoading = true;
    this.buyerOrgError = null;

    this.corporationService.publicSearchOrganization(orgNumber).subscribe({
      next: (response) => {
        this.buyerOrgSearchLoading = false;
        if (response.success && response.data) {
          this.buyerOrgSearched = true;
          this.patchCompanyFields(response.data);
          this.toastr.success('Company found successfully');
        } else {
          this.buyerOrgError = response.message || 'Company not found';
          this.toastr.error(this.buyerOrgError);
        }
      },
      error: (error) => {
        this.buyerOrgSearchLoading = false;
        this.buyerOrgError = 'Failed to search company';
        this.toastr.error(this.buyerOrgError);
      }
    });
  }

  // Search person
  searchPerson() {
    const ssn = this.purchaseForm.get('socialSecurityNumber')?.value;
    if (!ssn) {
      this.toastr.error('Please enter a social security number');
      return;
    }

    this.personSearchLoading = true;

    this.customerService.searchBySSN(ssn).subscribe({
      next: (response: { success: boolean; data?: any; message?: string }) => {
        this.personSearchLoading = false;
        if (response.success && response.data) {
          this.personData = response.data;
          this.patchPersonFields(response.data);
          this.toastr.success('Person found successfully');
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
    this.purchaseForm.patchValue({
      companyName: data.corp_name || '',
      streetAddress: data.street_address || '',
      city: data.city || data.registered_city || '',
      postalCode: data.postal_code || '',
      emailAddress: data.company_email || this.purchaseForm.get('emailAddress')?.value || '',
      telephoneNumber: data.company_phone?.number || data.company_phone || this.purchaseForm.get('telephoneNumber')?.value || '',
      organizationNumber: data.organization_number || this.purchaseForm.get('organizationNumber')?.value || ''
    });
  }

  // Patch person fields
  patchPersonFields(data: any) {
    const address = data.addresses?.[0] || {};
    this.purchaseForm.patchValue({
      customerName: `${data.name?.givenName || ''} ${data.name?.lastName || ''}`.trim(),
      legalId: data.legalId || '',
      street: address.street || '',
      city: address.city || '',
      zip: address.zip || ''
    });
  }

  // Open vehicle details modal
  openVehicleDetailsModal() {
    if (this.vehicleDetails) {
      this.showVehicleDetailsModal = true;
    }
  }

  // Close vehicle details modal
  closeVehicleDetailsModal() {
    this.showVehicleDetailsModal = false;
  }

  // Navigation method
  goBack() {
    this.router.navigate(['/dashboard/agreements']);
  }

  onCreditMarkingChange(event: any) {
    const value = event.target.value;
    this.showCreditMarkingFields = value === 'Yes';
  }

  // Load buyer information
  loadBuyerInfo() {
    this.authService.getUserDetails().subscribe({
      next: (user) => {
        if (user && user.corp) {
          const org = user.organization || {};
          this.buyerInfo = {
            name: `${user.first_name} ${user.last_name}`.trim() || org.contact_person || user.corp.corp_name,
            corp_id: user.corp.corp_id,
            organizationName: org.organization_name || user.corp.corp_name || '',
            organizationNumber: org.organization_number || '',
            email: org.company_email || user.email || '',
            phone: org.company_phone || user.mobile || '',
            address: org.company_address || '',
            businessCategory: org.business_category || '',
            legalForm: org.legal_form || ''
          };
        } else {
          console.warn('No corporation information found', user);
        }
      },
      error: (error: Error) => {
        console.error('Failed to load user details', error);
      }
    });
  }

  // Override get preview to include buyer information
  get preview() {
    return {
      ...this.purchaseForm.getRawValue(),
      buyer: this.buyerInfo,
      vehicleDetails: this.vehicleDetails
    };
  }

  // Add method to populate seller details
  private populateSellerDetails() {
    this.authService.getUserDetails().subscribe(user => {
      if (user) {
        this.purchaseForm.patchValue({
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
    // Ensure we have purchase details
    const purchaseDetails = agreementData.sales_details || agreementData.purchase_details || {};
    const vehicleDetails = agreementData.vehicle_id || agreementData.vehicle_details || {};
    
    // Determine customer details based on customerType
    let customerDetails: any = null;
    if (agreementData.customerType === 'Company') {
      // Try multiple paths for company details
      customerDetails = 
        agreementData.customer_details || 
        agreementData.customer_id?.company_details;
    } else {
      // Try multiple paths for person details
      customerDetails = 
        agreementData.customer_details || 
        agreementData.customer_id?.person_details;
    }

    // Patch form with loaded data
    const formPatch: any = {
      // Basic Information
      registrationNumber: purchaseDetails.registrationNumber || agreementData.registrationNumber,
      purchaseDate: purchaseDetails.purchaseDate || agreementData.salesDate,
      customerType: agreementData.customerType,
      emailAddress: purchaseDetails.emailAddress || agreementData.emailAddress,
      telephoneNumber: purchaseDetails.telephoneNumber || agreementData.telephoneNumber,

      // Purchase Information
      purchasePrice: purchaseDetails.purchasePrice,
      paymentMethod: purchaseDetails.paymentMethod,
      vatType: purchaseDetails.vatType,
      creditMarking: purchaseDetails.creditMarking,
      
      // Credit Marking Details
      ...(purchaseDetails.creditMarkingDetails ? {
        creditorName: purchaseDetails.creditMarkingDetails.creditor,
        creditAmount: purchaseDetails.creditMarkingDetails.creditAmount,
        depositor: purchaseDetails.creditMarkingDetails.depositor
      } : {}),

      // Vehicle Information
      mileage: purchaseDetails.mileage,
      latestService: purchaseDetails.latestService,
      numberOfKeys: purchaseDetails.numberOfKeys,
      deck: purchaseDetails.deck,
      notes: purchaseDetails.notes
    };

    // Populate customer-specific details
    if (agreementData.customerType === 'Company') {
      formPatch.organizationNumber = 
        customerDetails?.organization_number || 
        customerDetails?.organizationNumber;
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
      formPatch.contactPerson = 
        customerDetails?.contact_person || 
        customerDetails?.contactPerson;
      formPatch.businessCategory = 
        customerDetails?.business_category || 
        customerDetails?.businessCategory;
      formPatch.legalForm = 
        customerDetails?.legal_form || 
        customerDetails?.legalForm;
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

    // Set vehicle details for later use
    this.vehicleDetails = vehicleDetails;
    this.vehicleSearched = true;

    // Patch the form
    this.purchaseForm.patchValue(formPatch);

    // Optional: Log for debugging
    console.log('Populated Form Patch:', formPatch);
  }

  // Modify onSubmit to handle credit marking validation
  onSubmit() {
    // Clear validators for credit marking fields if credit marking is 'No'
    const creditMarkingValue = this.purchaseForm.get('creditMarking')?.value;
    const creditMarkingControls = ['creditorName', 'creditAmount', 'depositor'];
    
    if (creditMarkingValue !== 'Yes') {
      creditMarkingControls.forEach(control => {
        this.purchaseForm.get(control)?.clearValidators();
        this.purchaseForm.get(control)?.setValue('');
        this.purchaseForm.get(control)?.updateValueAndValidity();
      });
    }

    this.markFormGroupTouched(this.purchaseForm);

    if (this.purchaseForm.valid) {
      this.submitting = true;
      const formData = this.purchaseForm.value;

      // Prepare data according to new structure
      const payload: NewPurchaseAgreementPayload = {
        customerType: formData.customerType,
        
        purchase_details: {
          registrationNumber: formData.registrationNumber,
          purchaseDate: formData.purchaseDate,
        emailAddress: formData.emailAddress,
          telephoneNumber: formData.telephoneNumber || '',
          purchasePrice: Number(formData.purchasePrice),
        paymentMethod: formData.paymentMethod,
        vatType: formData.vatType,
        creditMarking: formData.creditMarking,
          mileage: Number(formData.mileage),
        latestService: formData.latestService,
        numberOfKeys: formData.numberOfKeys,
        deck: formData.deck,
          notes: formData.notes || ''
        },
        
        vehicle_details: this.vehicleDetails || {},

        customer_details: {
          email: formData.emailAddress,
          phone: formData.telephoneNumber || '',
          ...(formData.customerType === 'Company' ? {
            organization_number: formData.organizationNumber,
            corp_name: formData.companyName,
            street_address: formData.streetAddress,
            registered_city: formData.city,
            postal_code: formData.postalCode,
            city: formData.city,
            contact_person: formData.contactPerson,
            business_category: formData.businessCategory,
            legal_form: formData.legalForm
          } : this.personData && {
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
          })
        }
      };

      // Add credit marking details if applicable
      if (formData.creditMarking === 'Yes') {
        payload.purchase_details.creditMarkingDetails = {
          creditor: formData.creditorName,
          creditAmount: Number(formData.creditAmount),
          depositor: formData.depositor,
        };
      }

      // Determine whether to create or update
      if (this.isEditMode && this.agreementId) {
        // Update existing agreement
        this.agreementService.updatePurchaseAgreement(this.agreementId, payload).subscribe({
          next: (response) => {
            this.submitting = false;
            if (response.success) {
              this.toastr.success('Purchase agreement updated successfully');
              this.router.navigate(['/dashboard/agreements']);
            } else {
              this.toastr.error(response.message || 'Failed to update purchase agreement');
            }
          },
          error: (error) => {
            this.submitting = false;
            console.error('Error updating purchase agreement:', error);
            this.toastr.error(error.error?.message || 'Failed to update purchase agreement');
          }
        });
      } else {
        // Create new agreement (existing logic)
      this.agreementService.createPurchaseAgreement(payload).subscribe({
        next: (response) => {
          this.submitting = false;
          if (response.success) {
            this.toastr.success('Purchase agreement created successfully');
            this.router.navigate(['/dashboard/agreements']);
          } else {
            this.toastr.error(response.message || 'Failed to create purchase agreement');
          }
        },
        error: (error) => {
          this.submitting = false;
          console.error('Error creating purchase agreement:', error);
          this.toastr.error(error.error?.message || 'Failed to create purchase agreement');
        }
      });
      }
    } else {
      this.toastr.error('Please correct the highlighted fields before submitting');
      console.error('Form Validation Errors:', this.getFormValidationErrors());
    }
  }

  // Similar modification for onSubmitAndSign
  onSubmitAndSign() {
    // Clear validators for credit marking fields if credit marking is 'No'
    const creditMarkingValue = this.purchaseForm.get('creditMarking')?.value;
    const creditMarkingControls = ['creditorName', 'creditAmount', 'depositor'];
    
    if (creditMarkingValue !== 'Yes') {
      creditMarkingControls.forEach(control => {
        this.purchaseForm.get(control)?.clearValidators();
        this.purchaseForm.get(control)?.setValue('');
        this.purchaseForm.get(control)?.updateValueAndValidity();
      });
    }

    this.markFormGroupTouched(this.purchaseForm);

    if (this.purchaseForm.valid) {
      this.submittingAndSigning = true;
      const formData = this.purchaseForm.value;

      // Prepare data according to new structure
      const payload: NewPurchaseAgreementPayload = {
        customerType: formData.customerType,
        
        purchase_details: {
          registrationNumber: formData.registrationNumber,
          purchaseDate: formData.purchaseDate,
          emailAddress: formData.emailAddress,
          telephoneNumber: formData.telephoneNumber || '',
          purchasePrice: Number(formData.purchasePrice),
          paymentMethod: formData.paymentMethod,
          vatType: formData.vatType,
          creditMarking: formData.creditMarking,
          mileage: Number(formData.mileage),
          latestService: formData.latestService,
          numberOfKeys: formData.numberOfKeys,
          deck: formData.deck,
          notes: formData.notes || ''
        },
        
        vehicle_details: this.vehicleDetails || {},

        customer_details: {
          email: formData.emailAddress,
          phone: formData.telephoneNumber || '',
          ...(formData.customerType === 'Company' ? {
            organization_number: formData.organizationNumber,
            corp_name: formData.companyName,
            street_address: formData.streetAddress,
            registered_city: formData.city,
            postal_code: formData.postalCode,
            city: formData.city,
            contact_person: formData.contactPerson,
            business_category: formData.businessCategory,
            legal_form: formData.legalForm
          } : this.personData && {
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
          })
        }
      };

      // Add credit marking details if applicable
      if (formData.creditMarking === 'Yes') {
        payload.purchase_details.creditMarkingDetails = {
          creditor: formData.creditorName,
          creditAmount: Number(formData.creditAmount),
          depositor: formData.depositor,
        };
      }

      // Determine whether to create or update and sign
      if (this.isEditMode && this.agreementId) {
        // Create and sign updated agreement
        this.agreementService.createAndSignPurchaseAgreement(payload).subscribe({
          next: (response) => {
            this.submittingAndSigning = false;
            if (response.success) {
              this.toastr.success('Purchase agreement updated and signed successfully');
              const agreementId = response.data?.agreement_id || response.data?._id;
              if (agreementId) {
                this.router.navigate(['/sign', agreementId]);
              } else {
                this.router.navigate(['/dashboard/agreements']);
              }
            } else {
              this.toastr.error(response.message || 'Failed to update and sign purchase agreement');
            }
          },
          error: (error) => {
            this.submittingAndSigning = false;
            console.error('Error updating and signing purchase agreement:', error);
            this.toastr.error(error.error?.message || 'Failed to update and sign purchase agreement');
          }
        });
      } else {
        // Create and sign new agreement (existing logic)
      this.agreementService.createAndSignPurchaseAgreement(payload).subscribe({
        next: (response) => {
          this.submittingAndSigning = false;
          if (response.success) {
            this.toastr.success('Purchase agreement created and signed successfully');
            const agreementId = response.data?.agreement_id || response.data?._id;
            if (agreementId) {
              this.router.navigate(['/sign', agreementId]);
            } else {
              this.router.navigate(['/dashboard/agreements']);
            }
          } else {
            this.toastr.error(response.message || 'Failed to create and sign purchase agreement');
          }
        },
        error: (error) => {
          this.submittingAndSigning = false;
          console.error('Error creating and signing purchase agreement:', error);
          this.toastr.error(error.error?.message || 'Failed to create and sign purchase agreement');
        }
      });
      }
    } else {
      this.toastr.error('Please correct the highlighted fields before submitting');
      console.error('Form Validation Errors:', this.getFormValidationErrors());
    }
  }

  // Helper method to mark all form controls as touched
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

  // Helper method to get form validation errors
  private getFormValidationErrors(): any {
    const errors: any = {};
    Object.keys(this.purchaseForm.controls).forEach(key => {
      const controlErrors = this.purchaseForm.get(key)?.errors;
      if (controlErrors) {
        errors[key] = controlErrors;
      }
    });
    return errors;
  }

  getErrorMessage(form: FormGroup, controlName: string): string {
    const control = form.get(controlName);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    
    // Specific error messages for different fields
    switch(controlName) {
      case 'creditorName':
        if (errors['required']) return 'Creditor name is required';
        break;
      case 'creditAmount':
        if (errors['required']) return 'Credit amount is required';
        break;
      case 'depositor':
        if (errors['required']) return 'Depositor is required';
        break;
      case 'creditMarking':
        if (errors['required']) return 'Credit marking is required';
        break;
      case 'paymentMethod':
        if (errors['required']) return 'Payment method is required';
        break;
    }
    return '';
  }

  // Custom validator for non-empty select fields
  private nonEmptySelectValidator(control: AbstractControl) {
    const value = control.value;
    if (!value || value.trim() === '') {
      return {
        invalidSelect: true,
        message: 'Please select a valid option'
      };
    }
    return null;
  }

  // Add this method to the class
  formatNumber(event: Event, field: string) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const formattedValue = value.replace(/[^0-9.]/g, '');
    input.value = formattedValue;
  }
}
