import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { CustomerService, CustomerCreationData, CustomerStats, CustomerUpdateData } from '../../shared/service/customer/customer.service';
import { timer, switchMap, map, finalize, Subject } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ToastrService } from 'ngx-toastr';
import { delay, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { SelectOption } from '../../shared/components/custom-select/custom-select.component';
import { ActivatedRoute, Router } from '@angular/router';

export interface VehicleInfo {
  registration: string;
  contractId: string;
  model: string;
  contractValue: string;
  agreement: string;
  status: string;
  taxType: string;
  warranty: string;
}

export interface Customer {
  _id: string;
  customer_id: string;
  corp_id: string;
  user_id: string;
  name: string;
  companyName?: string;
  personalNumber?: string;
  orgNumber?: string;
  telephone: string;
  email: string;
  address: string;
  postalCode?: string;
  location?: string;
  type: string;
  customerType: string;
  role?: string;
  status: string;
  numberOfOrders: number | string;
  totalSpent: number | string;
  latestPurchase?: string | null;
  agreementType?: string | null;
  warranty?: string;
  warrantyPeriod?: string;
  vehicleInfo?: VehicleInfo;
  person_details?: any;
  company_details?: any;
}

@Component({
  selector: "app-customer",
  templateUrl: "./customer.component.html"
})
export class CustomerComponent implements OnInit, OnDestroy {
  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  paginatedCustomers: Customer[] = [];
  expandedRowKey: string | null = null;
  loading: boolean = false;
  loadingError: string | null = null;
  private readonly MINIMUM_LOADING_TIME = 250;

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 15;
  totalItems = 0;
  private _apiTotalPages = 0;
  
  filterForm: FormGroup;
  showAdvancedSearchPanel: boolean = false;

  // New properties for customer creation modal
  isCustomerModalVisible = false;
  customerForm: FormGroup;
  customerModalLoading = false;

  // New properties for delete functionality
  showDeleteConfirmationModal = false;
  deletingCustomer = false;
  customerToDeleteId: string | null = null;
  
  // Stats
  stats: CustomerStats = {
    privateCustomers: 0,
    companyCustomers: 0,
    totalCustomers: 0,
    purchaseAgreements: 0,
    salesAgreements: 0,
    otherAgreements: 0
  };
  
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // New properties for editing
  isEditCustomerModalVisible = false;
  editCustomerForm: FormGroup;
  editCustomerModalLoading = false;
  customerToEditId: string | null = null;

  // Customer Type Options for Shared Custom Select
  customerTypeOptions: SelectOption[] = [
    { value: 'Private Individual', label: 'Private Individual' },
    { value: 'Company', label: 'Company' }
  ];

  // Organization search state
  orgSearchLoading = false;
  orgSearched = false;
  orgData: any = null;
  orgError = '';

  // Person search state
  personSearchLoading = false;
  personSearched = false;
  personData: any = null;
  personError = '';

  constructor(
    private customerService: CustomerService, 
    private fb: FormBuilder,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      searchTerm: [""],
      statusAdv: [""],
      typeAdv: [""],
      fromDate: [""],
      toDate: [""]
    });

    this.setupSearchDebounce();

    // Initialize customer creation form
    this.customerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required]],
      address: ['', [Validators.required]],
      postalCode: [''],
      location: [''],
      type: ['Private Individual', [Validators.required]],
      status: ['Active', [Validators.required]],
      socialSecurityNumber: ['', []],
      organizationNumber: ['', []]
    });

    // Initialize edit customer form
    this.editCustomerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required]],
      address: ['', [Validators.required]],
      postalCode: [''],
      location: [''],
      type: ['Private Individual', [Validators.required]],
      status: ['Active', [Validators.required]],
      socialSecurityNumber: ['', []],
      organizationNumber: ['', []]
    });

    // Call onCustomerTypeChange on form init and on type valueChanges
    this.customerForm.get('type')?.valueChanges.subscribe(() => this.onCustomerTypeChange(this.customerForm));
    this.editCustomerForm.get('type')?.valueChanges.subscribe(() => this.onCustomerTypeChange(this.editCustomerForm));
    this.onCustomerTypeChange(this.customerForm);
    this.onCustomerTypeChange(this.editCustomerForm);
  }

  ngOnInit(): void {
    this.loadCustomers();

    // Check for query parameters to open customer creation modal
    this.route.queryParams.subscribe(params => {
      const createCustomer = params['createCustomer'] === 'true';
      const customerType = params['customerType'];

      if (createCustomer) {
        // Open customer creation modal with pre-selected type
        this.openCustomerModal(customerType);

        // Clear the query parameters
        this.router.navigate([], { 
          queryParams: { createCustomer: null, customerType: null },
          queryParamsHandling: 'merge'
        });
      }
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300), // Wait for 300ms after the last keystroke
      distinctUntilChanged(), // Only emit if the value has changed
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.currentPage = 1;
      this.loadCustomers();
    });
  }

  onSearchInput(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.searchSubject.next(searchTerm);
  }

  loadCustomers(): void {
    this.loading = true;
    this.loadingError = null;
    
    const filters = this.getFilterParams();
    
    this.customerService.getAllCustomers(
      this.currentPage,
      this.itemsPerPage,
      filters
    ).subscribe({
      next: (response) => {
        if (response.success) {
          // Log raw customer data for debugging
          console.log('Raw Customer Data:', response.data);
          
          // Transform customers to ensure all optional fields exist
          this.paginatedCustomers = response.data.map((customer: any) => {
            const normalizedCustomer = this.normalizeCustomer(customer);
            console.log('Normalized Customer:', normalizedCustomer);
            return normalizedCustomer;
          });
          
          this.totalItems = response.totalItems;
          this._apiTotalPages = response.totalPages;
          
          // Manually count customer types
          const privateCustomers = this.paginatedCustomers.filter(
            customer => customer.customerType === 'Private Individual'
          ).length;
          
          const companyCustomers = this.paginatedCustomers.filter(
            customer => customer.customerType === 'Company'
          ).length;
          
          // Update stats with manually counted values
          this.stats = {
            ...response.stats,
            privateCustomers,
            companyCustomers,
            totalCustomers: this.paginatedCustomers.length
          };
          
          console.log('Manually Counted Stats:', this.stats);
          console.log('Customer Types:', 
            this.paginatedCustomers.map(customer => customer.customerType)
          );
        } else {
          this.paginatedCustomers = [];
          this.loadingError = response.message || 'Failed to load customers.';
        }
        this.loading = false;
      },
      error: () => {
        this.paginatedCustomers = [];
        this.loadingError = 'Failed to load customers. Please try again.';
        this.loading = false;
      }
    });
  }
  
  getFilterParams(): any {
    const filters: any = {};
    
    if (this.filterForm.get('searchTerm')?.value) {
      filters.searchTerm = this.filterForm.get('searchTerm')?.value;
    }
    
    if (this.filterForm.get('statusAdv')?.value) {
      filters.statusAdv = this.filterForm.get('statusAdv')?.value;
    }
    
    if (this.filterForm.get('typeAdv')?.value) {
      filters.typeAdv = this.filterForm.get('typeAdv')?.value;
    }
    
    if (this.filterForm.get('fromDate')?.value) {
      filters.fromDate = this.filterForm.get('fromDate')?.value;
    }
    
    if (this.filterForm.get('toDate')?.value) {
      filters.toDate = this.filterForm.get('toDate')?.value;
    }
    
    return filters;
  }

  // Normalize customer data to ensure all fields exist
  private normalizeCustomer(customer: any): Customer {
    // Strictly use customerType, with a fallback to a default
    const normalizedType = customer.customerType || 'Private Individual';

    return {
      _id: customer._id,
      customer_id: customer._id, // Use _id as customer_id
      corp_id: customer.corp_id,
      user_id: customer.user_id,
      name: customer.name,
      telephone: customer.telephone,
      email: customer.email,
      address: customer.address,
      status: customer.status || 'Active',
      customerType: normalizedType,
      type: normalizedType,
      agreementType: customer.agreementType || 'N/A',
      companyName: normalizedType === 'Company' ? customer.name : 'N/A',
      person_details: normalizedType === 'Private Individual' ? customer.person_details : 'N/A',
      company_details: normalizedType === 'Company' ? customer.company_details : 'N/A',
      postalCode: customer.postalCode || '',
      location: customer.location || '',
      numberOfOrders: 0,
      totalSpent: 0,
      latestPurchase: customer.createdAt,
      role: 'buyer',
      warranty: 'N/A',
      warrantyPeriod: 'N/A'
    };
  }

  applyClientFilters(): void {
    this.currentPage = 1;
    this.loadCustomers();
  }

  resetAdvancedFilters(): void {
    this.filterForm.patchValue({
      statusAdv: '',
      typeAdv: '',
      fromDate: '',
      toDate: ''
    });
    this.currentPage = 1;
    this.loadCustomers();
    this.showAdvancedSearchPanel = false;
  }

  applyAdvancedSearch(): void {
    this.currentPage = 1;
    this.loadCustomers();
    this.showAdvancedSearchPanel = false;
  }

  toggleAccordion(rowKey: string, customer: Customer): void {
    this.expandedRowKey = this.expandedRowKey === rowKey ? null : rowKey;
  }

  // Method to open customer creation modal
  openCustomerModal(preselectedType?: string): void {
    this.isCustomerModalVisible = true;
    
    // Reset search states
    this.orgSearched = false;
    this.orgData = null;
    this.orgError = '';
    this.personSearched = false;
    this.personData = null;
    this.personError = '';
    
    // Reset form with default or preselected type
    this.customerForm.reset({
      type: preselectedType || 'Private Individual',
      status: 'Active'
    });

    // Trigger type change to set appropriate validations
    this.onCustomerTypeChange(this.customerForm);
  }

  // Method to close customer creation modal
  closeCustomerModal(): void {
    this.isCustomerModalVisible = false;
  }

  // Method to submit new customer
  onCustomerSubmit(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      this.toastr.error('Please fill in all required fields correctly', 'Error');
      return;
    }

    // Check if organization or person has been searched
    const type = this.customerForm.get('type')?.value;
    if (type === 'Company' && !this.orgSearched) {
      this.toastr.error('Please search and verify organization details', 'Error');
      return;
    }
    if (type !== 'Company' && !this.personSearched) {
      this.toastr.error('Please search and verify person details', 'Error');
      return;
    }

    this.customerModalLoading = true;
    const startTime = Date.now();

    // Prepare customer data, using search data if available
    const customerData: CustomerCreationData = {
      name: this.customerForm.get('name')?.value,
      email: this.customerForm.get('email')?.value,
      telephone: this.customerForm.get('telephone')?.value,
      address: this.customerForm.get('address')?.value,
      type,
      status: this.customerForm.get('status')?.value,
      ...(type === 'Company' ? { 
        organizationNumber: this.customerForm.get('organizationNumber')?.value,
        companyName: this.orgData?.corp_name || this.customerForm.get('companyName')?.value
      } : { 
        socialSecurityNumber: this.customerForm.get('socialSecurityNumber')?.value,
        name: this.personData ? 
          `${this.personData.name.givenName} ${this.personData.name.lastName}` : 
          this.customerForm.get('name')?.value
      }),
      ...(this.customerForm.get('postalCode')?.value && { postalCode: this.customerForm.get('postalCode')?.value }),
      ...(this.customerForm.get('location')?.value && { location: this.customerForm.get('location')?.value })
    };

    this.customerService.createCustomer(customerData).pipe(
      delay(Math.max(0, this.MINIMUM_LOADING_TIME - (Date.now() - startTime))),
      finalize(() => {
        this.customerModalLoading = false;
      })
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Customer created successfully', 'Success');
          this.loadCustomers();
          this.closeCustomerModal();
        } else {
          this.toastr.error(
            response.message || 'Failed to create customer', 
            'Error'
          );
        }
      },
      error: (error) => {
        this.toastr.error(
          error.error?.message || 'Failed to create customer', 
          'Error'
        );
      }
    });
  }

  // Method to open delete confirmation modal
  confirmDeleteCustomer(customerId: string): void {
    this.customerToDeleteId = customerId;
    this.showDeleteConfirmationModal = true;
    event?.stopPropagation();
  }

  // Method to cancel delete operation
  cancelDeleteCustomer(): void {
    this.customerToDeleteId = null;
    this.showDeleteConfirmationModal = false;
  }

  // Method to delete customer
  deleteCustomer(): void {
    if (!this.customerToDeleteId) {
      this.toastr.error('No customer selected for deletion', 'Error');
      return;
    }

    this.deletingCustomer = true;
    this.customerService.deleteCustomer(this.customerToDeleteId).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Customer deleted successfully', 'Success');
          this.loadCustomers();
          this.expandedRowKey = null;
        } else {
          this.toastr.error(response.message || 'Failed to delete customer', 'Error');
        }
        this.deletingCustomer = false;
        this.showDeleteConfirmationModal = false;
        this.customerToDeleteId = null;
      },
      error: (error) => {
        this.toastr.error(error.error?.message || 'Failed to delete customer', 'Error');
        this.deletingCustomer = false;
        this.showDeleteConfirmationModal = false;
      }
    });
  }
  
  // Use the getter for calculations
  get totalPages(): number {
    // Return the API total pages, or calculate from items and page size
    return this._apiTotalPages || Math.ceil(this.totalItems / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadCustomers();
    }
  }

  getDisplayedPageNumbers(): number[] {
    const cp = this.currentPage;
    const tp = this.totalPages;

    if (tp === 0) return [];
    if (tp === 1) return [1];

    const pages: number[] = [];

    if (cp === 1) {
      pages.push(1);
      if (tp >= 2) pages.push(2);
      if (tp >= 3) pages.push(3);
    } else if (cp === tp) {
      if (tp >= 3) pages.push(tp - 2);
      if (tp >= 2) pages.push(tp - 1);
      pages.push(tp);
    } else {
      pages.push(cp - 1);
      pages.push(cp);
      pages.push(cp + 1);
    }
    return Array.from(new Set(pages.filter((p) => p > 0 && p <= tp))).sort(
      (a, b) => a - b
    );
  }

  getRowKey(customer: Customer, index: number): string {
    return customer.customer_id ? customer.customer_id : `customer_${index}`;
  }

  // Method to open edit customer modal
  openEditCustomerModal(customer: Customer): void {
    this.customerToEditId = customer.customer_id;
    
    // Reset search states
    this.orgSearched = false;
    this.orgData = null;
    this.orgError = '';
    this.personSearched = false;
    this.personData = null;
    this.personError = '';
    
    // Find the matching customer type option
    const customerType = customer.type === 'Business' ? 'Company' : customer.type;

    this.editCustomerForm.patchValue({
      name: customer.name,
      email: customer.email,
      telephone: customer.telephone,
      address: customer.address,
      postalCode: customer.postalCode || '',
      location: customer.location || '',
      type: customerType,
      status: customer.status,
      person_details: customer.type === 'Private Individual' ? customer.person_details : 'N/A',
      company_details: customer.type === 'Company' ? customer.company_details : 'N/A'
    });

    this.isEditCustomerModalVisible = true;
    
    // Trigger type change to set appropriate validations
    this.onCustomerTypeChange(this.editCustomerForm);
  }

  // Method to close edit customer modal
  closeEditCustomerModal(): void {
    this.isEditCustomerModalVisible = false;
    this.customerToEditId = null;
  }

  // Method to submit customer edit
  onCustomerEditSubmit(): void {
    if (this.editCustomerForm.invalid) {
      this.editCustomerForm.markAllAsTouched();
      this.toastr.error('Please fill in all required fields correctly', 'Error');
      return;
    }

    if (!this.customerToEditId) {
      this.toastr.error('No customer selected for editing', 'Error');
      return;
    }

    // Check if organization or person has been searched
    const type = this.editCustomerForm.get('type')?.value;
    if (type === 'Company' && !this.orgSearched) {
      this.toastr.error('Please search and verify organization details', 'Error');
      return;
    }
    if (type !== 'Company' && !this.personSearched) {
      this.toastr.error('Please search and verify person details', 'Error');
      return;
    }

    this.editCustomerModalLoading = true;
    const startTime = Date.now();

    // Prepare customer update data, using search data if available
    const customerUpdateData: CustomerUpdateData = {
      name: this.editCustomerForm.get('name')?.value,
      email: this.editCustomerForm.get('email')?.value,
      telephone: this.editCustomerForm.get('telephone')?.value,
      address: this.editCustomerForm.get('address')?.value,
      type,
      status: this.editCustomerForm.get('status')?.value,
      ...(type === 'Company' ? { 
        organizationNumber: this.editCustomerForm.get('organizationNumber')?.value,
        companyName: this.orgData?.corp_name || this.editCustomerForm.get('companyName')?.value
      } : { 
        socialSecurityNumber: this.editCustomerForm.get('socialSecurityNumber')?.value,
        name: this.personData ? 
          `${this.personData.name.givenName} ${this.personData.name.lastName}` : 
          this.editCustomerForm.get('name')?.value
      }),
      ...(this.editCustomerForm.get('postalCode')?.value && { postalCode: this.editCustomerForm.get('postalCode')?.value }),
      ...(this.editCustomerForm.get('location')?.value && { location: this.editCustomerForm.get('location')?.value })
    };

    this.customerService.updateCustomer(this.customerToEditId, customerUpdateData).pipe(
      delay(Math.max(0, this.MINIMUM_LOADING_TIME - (Date.now() - startTime))),
      finalize(() => {
        this.editCustomerModalLoading = false;
      })
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Customer updated successfully', 'Success');
          this.loadCustomers();
          this.closeEditCustomerModal();
        } else {
          this.toastr.error(
            response.message || 'Failed to update customer', 
            'Error'
          );
        }
      },
      error: (error) => {
        this.toastr.error(
          error.error?.message || 'Failed to update customer', 
          'Error'
        );
      }
    });
  }

  // On customer type change, reset/require correct number field
  onCustomerTypeChange(form: FormGroup) {
    const type = form.get('type')?.value;
    if (type === 'Company') {
      form.get('organizationNumber')?.setValidators([Validators.required]);
      form.get('socialSecurityNumber')?.clearValidators();
      form.get('socialSecurityNumber')?.setValue('');
    } else {
      form.get('socialSecurityNumber')?.setValidators([Validators.required]);
      form.get('organizationNumber')?.clearValidators();
      form.get('organizationNumber')?.setValue('');
    }
    form.get('organizationNumber')?.updateValueAndValidity();
    form.get('socialSecurityNumber')?.updateValueAndValidity();
  }

  // Method to search organization
  searchOrganization() {
    const orgNumber = this.customerForm.get('organizationNumber')?.value || 
                      this.editCustomerForm.get('organizationNumber')?.value;
    
    if (!orgNumber) {
      this.toastr.error('Please enter an organization number');
      return;
    }

    this.orgSearchLoading = true;
    this.orgSearched = false;
    this.orgData = null;
    this.orgError = '';

    this.customerService.searchOrganization(orgNumber).subscribe({
      next: (response) => {
        this.orgSearchLoading = false;
        if (response.success && response.data) {
          this.orgSearched = true;
          this.orgData = response.data;
          
          // Determine which form to patch based on current context
          const form = this.isCustomerModalVisible ? this.customerForm : this.editCustomerForm;
          
          // Patch form with organization details
          form.patchValue({
            name: response.data.corp_name,
            address: response.data.street_address,
            location: response.data.city || response.data.registered_city,
            postalCode: response.data.postal_code,
            telephone: response.data.company_phone || '',
            email: response.data.company_email || ''
          });

          this.toastr.success('Organization found');
        } else {
          this.orgError = 'Organization not found. Please check the number.';
          this.toastr.error(this.orgError);
        }
      },
      error: (err) => {
        this.orgSearchLoading = false;
        this.orgError = 'Error searching organization. Please try again.';
        this.toastr.error(this.orgError);
      }
    });
  }

  // Method to search person
  searchPerson() {
    const socialSecurityNumber = this.customerForm.get('socialSecurityNumber')?.value || 
                                  this.editCustomerForm.get('socialSecurityNumber')?.value;
    
    if (!socialSecurityNumber) {
      this.toastr.error('Please enter a social security number');
      return;
    }

    this.personSearchLoading = true;
    this.personSearched = false;
    this.personData = null;
    this.personError = '';

    this.customerService.searchPersonBySSN(socialSecurityNumber).subscribe({
      next: (response) => {
        this.personSearchLoading = false;
        if (response.success && response.data) {
          this.personSearched = true;
          this.personData = response.data;
          
          // Determine which form to patch based on current context
          const form = this.isCustomerModalVisible ? this.customerForm : this.editCustomerForm;
          
          // Get first address if available
          const address = response.data.addresses && response.data.addresses.length > 0 
            ? response.data.addresses[0] 
            : null;

          // Patch form with person details
          form.patchValue({
            name: `${response.data.name.givenName} ${response.data.name.lastName}`,
            address: address ? `${address.street} ${address.number}` : '',
            location: address ? address.city : '',
            postalCode: address ? address.zip : '',
            telephone: '', // No telephone in the response
            email: '' // No email in the response
          });

          this.toastr.success('Person found');
        } else {
          this.personError = 'Person not found. Please check the social security number.';
          this.toastr.error(this.personError);
        }
      },
      error: (err) => {
        this.personSearchLoading = false;
        this.personError = 'Error searching person. Please try again.';
        this.toastr.error(this.personError);
      }
    });
  }
}
