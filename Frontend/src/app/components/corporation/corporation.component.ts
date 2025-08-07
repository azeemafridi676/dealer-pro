import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CorporationService, ApiResponse, PaginatedCorporationResponse, Corporation, Resource, FullOrganizationRegistration } from 'src/app/shared/service/corporation/corporation.service';
import { ToastrService } from 'ngx-toastr';
import { NavService } from 'src/app/shared/service/navbar/nav.service';
import { modalAnimation } from 'src/app/shared/animations/modal.animations';
import { Router, NavigationEnd } from '@angular/router';
import { LoggingService } from 'src/app/shared/service/logging.service';
import { ThemeService } from 'src/app/shared/service/theme.service';
import { finalize, delay, filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

// Interface for the API resource data
interface ApiResource {
  resource_id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
}

// Extended Corporation interface
interface ExtendedCorporation {
  _id: string;
  corp_id: string;
  corp_name: string;
  corp_active: boolean;
  corp_website?: string;
  corp_persona?: string;
  corp_contact_name: string;
  corp_contact_email: string;
  corp_contact_phone: string;
  corp_billing_name: string;
  corp_billing_email: string;
  corp_billing_phone: string;
  allowed_resources: string[];
  allowed_resources_names?: Array<{
    resource_id: string;
    title: string;
  }>;
}

@Component({
  selector: 'app-corporation',
  templateUrl: './corporation.component.html',
  styleUrls: ['./corporation.component.scss'],
  animations: [modalAnimation]
})
export class CorporationComponent implements OnInit, OnDestroy {
  private routerSubscription: Subscription;
  private initialized = false;
  corporations: ExtendedCorporation[] = [];
  selectedId: string = '';
  isVisible = false;
  showDeleteModal = false;
  private corporationToDelete: string | null = null;
  private readonly SOURCE = 'corporation.component.ts';
  corpForm: FormGroup = this.fb.group({
    organization_number: ['', Validators.required],
    corp_name: ['', Validators.required],
    street_address: ['', Validators.required],
    registered_city: ['', Validators.required],
    postal_code: ['', Validators.required],
    city: ['', Validators.required],
    company_email: ['', [Validators.required, Validators.email]],
    company_phone: ['', Validators.required],
    allowed_resources: [[]],
    admin_first_name: ['', Validators.required],
    admin_last_name: ['', Validators.required],
    admin_email: ['', [Validators.required, Validators.email]],
    admin_password: ['', Validators.required],
    admin_phone: ['', Validators.required],
    corp_active: [true],
    agreement: [false, Validators.requiredTrue]
  });
  loading = false;
  searchTerm: string = '';
  filteredCorporations: ExtendedCorporation[] = [];
  isEditMode = false;
  selectedCorporation: any = null;
  allResources: Resource[] = [];
  selectedResources = new Set<string>();
  currentTheme$ = this.themeService.currentTheme$;

  // New properties for handling corporation users view
  showCorpUsers = false;
  selectedCorpForUsers: any = null;

  orgSearchLoading = false;

  private readonly MINIMUM_LOADING_TIME = 250; // Minimum time to show loading state in ms

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 15;
  totalItems = 0;
  totalPages = 0;

  constructor(
    private corporationService: CorporationService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private navService: NavService,
    private router: Router,
    private loggingService: LoggingService,
    private themeService: ThemeService
  ) {
    this.initForm();
    
    // Subscribe to router events to handle navigation
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.initialized) {
        this.loading = true; // Set loading before data fetch
        this.loadAllResources().then(() => this.loadCorporations());
      }
    });
  }

  private initForm(): void {
    this.corpForm = this.fb.group({
      organization_number: ['', Validators.required],
      corp_name: ['', Validators.required],
      street_address: ['', Validators.required],
      registered_city: ['', Validators.required],
      postal_code: ['', Validators.required],
      city: ['', Validators.required],
      company_email: ['', [Validators.required, Validators.email]],
      company_phone: ['', Validators.required],
      allowed_resources: [[]],
      admin_first_name: ['', Validators.required],
      admin_last_name: ['', Validators.required],
      admin_email: ['', [Validators.required, Validators.email]],
      admin_password: ['', Validators.required],
      admin_phone: ['', Validators.required],
      corp_active: [true],
      agreement: [false, Validators.requiredTrue]
    });
  }

  ngOnInit(): void {
    this.loading = true; // Set initial loading state
    this.initialized = true;
    this.navService.setTitle('Corporations');
    this.navService.setSubtitle('Manage your corporations');
    this.loadAllResources().then(() => {
      this.loadCorporations();
    });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  loadAllResources(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.corporationService.getAvailableResources().subscribe({
        next: (response: ApiResponse<Resource[]>) => {
          if (response.success) {
            this.allResources = response.data;
            resolve();
          } else {
            this.toastr.error('Failed to load resources', 'Error');
            reject('Failed to load resources');
          }
        },
        error: (error: any) => {
          this.toastr.error(error.error?.message || 'Failed to load resources', 'Error');
          reject(error);
        }
      });
    });
  }

  loadCorporations(): void {
    const startTime = Date.now();

    this.corporationService.getAllCorporations(this.currentPage, this.itemsPerPage, this.searchTerm).pipe(
      delay(Math.max(0, this.MINIMUM_LOADING_TIME - (Date.now() - startTime))),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (response: any) => {
        if (response.success) {
          // Ensure we have all the details needed for editing
          this.corporations = response.data.map((corp: any) => ({
            ...corp,
            organization_number: corp.organization_number,
            street_address: corp.street_address || '',
            registered_city: corp.registered_city || '',
            postal_code: corp.postal_code || '',
            city: corp.city || '',
            company_email: corp.company_email || '',
            company_phone: corp.company_phone || '',
            allowed_resources: corp.allowed_resources || [],
            corp_active: corp.corp_active !== undefined ? corp.corp_active : true
          }));
          this.totalItems = response.totalItems;
          this.totalPages = response.totalPages;

          // Log corporations for debugging
          console.log('Loaded Corporations:', this.corporations);
        } else {
          this.toastr.error('Failed to load corporations', 'Error');
        }
      },
      error: (error: any) => {
        this.toastr.error(error.error?.message || 'Failed to load corporations', 'Error');
      }
    });
  }

  openModal(corp?: any): void {
    this.isEditMode = !!corp;
    console.log('Opening modal - isEditMode:', this.isEditMode);
    this.selectedCorporation = corp;

    // Reset form to default state
    this.initForm();
    this.selectedResources.clear();

    // If in edit mode, fetch full corporation details
    if (corp) {
      this.loading = true;
      console.log('Fetching full corporation details for:', corp.corp_id);
      this.corporationService.getFullCorporationDetails(corp.corp_id).subscribe({
        next: (response) => {
          if (response.success) {
            const fullCorp = response.data.corporation;
            const orgData = response.data.organization;

            console.log('Full Corporation Data:', fullCorp);
            console.log('Organization Data:', orgData);

            // Prepare form values
            const formValues = {
              organization_number: orgData?.legalId || orgData?.organization_number,
              corp_name: orgData?.corp_name || corp.corp_name || '',
              street_address: orgData?.street_address || corp.street_address || '',
              registered_city: orgData?.registered_city || corp.registered_city || '',
              postal_code: orgData?.postal_code || corp.postal_code || '',
              city: orgData?.city || corp.city || '',
              company_email: orgData?.company_email || corp.company_email || '',
              company_phone: orgData?.company_phone || corp.company_phone || ''
            };

            // Populate form with corporation and organization data
      this.corpForm = this.fb.group({
              organization_number: [formValues.organization_number, Validators.required],
              corp_name: [formValues.corp_name, Validators.required],
              street_address: [formValues.street_address, Validators.required],
              registered_city: [formValues.registered_city, Validators.required],
              postal_code: [formValues.postal_code, Validators.required],
              city: [formValues.city, Validators.required],
              company_email: [formValues.company_email, [Validators.required, Validators.email]],
              company_phone: [formValues.company_phone, Validators.required],
              allowed_resources: [{ value: fullCorp.allowed_resources || [], disabled: false }],
        admin_first_name: [{ value: '', disabled: true }, Validators.required],
        admin_last_name: [{ value: '', disabled: true }, Validators.required],
        admin_email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
        admin_password: [{ value: '', disabled: true }, Validators.required],
        admin_phone: [{ value: '', disabled: true }, Validators.required],
              corp_active: [{ value: fullCorp.corp_active !== undefined ? fullCorp.corp_active : true, disabled: false }],
        agreement: [{ value: false, disabled: true }, Validators.requiredTrue]
            });

            // Disable auto-filled fields if they are not empty
            const autoFillFields = [
              'corp_name', 
              'street_address', 
              'registered_city', 
              'postal_code', 
              'city', 
              'company_email', 
              'company_phone'
            ];

            // Check if the organization number exists and auto-filled fields are not empty
            if (formValues.organization_number) {
              autoFillFields.forEach(field => {
                const fieldValue = this.corpForm.get(field)?.value;
                if (fieldValue && fieldValue.trim() !== '') {
                  this.corpForm.get(field)?.disable();
                }
              });
            }

            // Reset and populate selected resources
            this.selectedResources.clear();
            if (fullCorp.allowed_resources) {
              fullCorp.allowed_resources.forEach((resourceId: string) => {
                this.selectedResources.add(resourceId);
              });
            }

            // Log for debugging
            console.log('Form created with organization number:', 
              this.corpForm.get('organization_number')?.value, 
              'Disabled:', 
              this.corpForm.get('organization_number')?.disabled
            );
          } else {
            this.toastr.error('Failed to fetch corporation details', 'Error');
          }
          this.loading = false;
          this.isVisible = true;
        },
        error: (error) => {
          this.toastr.error('Error fetching corporation details', 'Error');
          this.loading = false;
        }
      });
    } else {
      // Add mode: reset form to default state with org search enabled
      console.log('Opening modal in ADD mode');
      this.initForm();
      this.selectedResources.clear();
      this.isVisible = true;
    }
  }

  closeModal(): void {
    this.isVisible = false;
    this.corpForm.reset();
    this.selectedCorporation = null;
    this.selectedResources.clear();
  }

  onSubmit(): void {
    if (this.corpForm.invalid) {
      this.corpForm.markAllAsTouched();
      this.toastr.error('Please fill in all required fields correctly');
      return;
    }

    const formValue = this.corpForm.getRawValue(); // Use getRawValue() to get all values including disabled fields

    if (this.isEditMode) {
      console.log("is in edit mode")
      const payload: FullOrganizationRegistration & { 
        corp_active?: boolean, 
        allowed_resources?: string[] 
      } = {
        corp_id: this.selectedCorporation.corp_id,
        organization_number: formValue.organization_number,
        corp_name: formValue.corp_name,
        street_address: formValue.street_address,
        registered_city: formValue.registered_city,
        postal_code: formValue.postal_code,
        city: formValue.city,
        company_email: formValue.company_email,
        company_phone: formValue.company_phone,
        corp_active: formValue.corp_active,
        allowed_resources: Array.from(this.selectedResources),
        admin_data: {
          first_name: '', // Not used in update
          last_name: '',  // Not used in update
          email: '',      // Not used in update
          phone: '',      // Not used in update
          password: ''    // Not used in update
        }
      };

      this.loading = true;
      const startTime = Date.now();

      this.corporationService.updateFullOrganization(payload).pipe(
        delay(Math.max(0, this.MINIMUM_LOADING_TIME - (Date.now() - startTime))),
        finalize(() => {
          this.loading = false;
        })
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success('Corporation updated successfully', 'Success');
            this.loadCorporations();
            this.closeModal();
          } else {
            // If organization not found, suggest searching again
            if (response.message?.includes('Organization not found')) {
              this.toastr.warning('Organization details not found. Please search again.', 'Update Warning');
              // Optionally, trigger organization search
              this.onOrgSearch();
            } else {
              this.toastr.error(response.message || 'Failed to update corporation', 'Error');
            }
          }
        },
        error: (error) => {
          this.toastr.error(error.error?.message || 'Failed to process corporation', 'Error');
        }
      });
    } else {
      const payload: FullOrganizationRegistration = {
        organization_number: formValue.organization_number,
        corp_name: formValue.corp_name,
        street_address: formValue.street_address,
        registered_city: formValue.registered_city,
        postal_code: formValue.postal_code,
        city: formValue.city,
        company_email: formValue.company_email,
        company_phone: formValue.company_phone,
        allowed_resources: Array.from(this.selectedResources),
        admin_data: {
          first_name: formValue.admin_first_name,
          last_name: formValue.admin_last_name,
          email: formValue.admin_email,
          phone: formValue.admin_phone,
          password: formValue.admin_password,
        }
      };

      this.loading = true;
      const startTime = Date.now();

      this.corporationService.registerFullOrganization(payload).pipe(
        delay(Math.max(0, this.MINIMUM_LOADING_TIME - (Date.now() - startTime))),
        finalize(() => {
          this.loading = false;
        })
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success('Corporation created successfully', 'Success');
            this.loadCorporations();
            this.closeModal();
          } else {
            this.toastr.error(response.message || 'Failed to create corporation', 'Error');
          }
        },
        error: (error) => {
          this.toastr.error(error.error?.message || 'Failed to process corporation', 'Error');
        }
      });
    }
  }

  deleteCorporation(corpId: string): void {
    this.corporationToDelete = corpId;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.corporationToDelete = null;
  }

  confirmDeleteCorporation(): void {
    if (!this.corporationToDelete) return;
    
    this.loading = true;
    const startTime = Date.now();

    this.corporationService.deleteCorporation(this.corporationToDelete).pipe(
      delay(Math.max(0, this.MINIMUM_LOADING_TIME - (Date.now() - startTime))),
      finalize(() => {
        this.loading = false;
        this.closeDeleteModal();
      })
    ).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.toastr.success('Corporation deleted successfully');
          this.loadCorporations();
        } else {
          this.toastr.error('Failed to delete corporation');
        }
      },
      error: (error: any) => {
        this.toastr.error(error.error?.message || 'Failed to delete corporation');
      }
    });
  }

  toggleResource(resourceId: string): void {
    if (this.selectedResources.has(resourceId)) {
      this.selectedResources.delete(resourceId);
    } else {
      this.selectedResources.add(resourceId);
    }
    // Update the form control with the current selected resources
    this.corpForm.patchValue({
      allowed_resources: Array.from(this.selectedResources)
    });
  }

  isResourceSelected(resourceId: string): boolean {
    return this.selectedResources.has(resourceId);
  }

  onSearch(event: any): void {
    const searchTerm = event.target.value.toLowerCase();
    this.filteredCorporations = this.corporations.filter(corp => 
      corp.corp_name.toLowerCase().includes(searchTerm) ||
      corp.corp_contact_email.toLowerCase().includes(searchTerm) ||
      corp.corp_contact_name.toLowerCase().includes(searchTerm)
    );
  }

  // New method to view corporation users
  viewCorporationUsers(corp: any): void {
    this.selectedCorpForUsers = corp;
    this.showCorpUsers = true;
    this.navService.setTitle('Corporation Users');
    this.navService.setSubtitle(`Users for ${corp.corp_name}`);
  }

  // New method to go back to corporations list
  backToCorporations(): void {
    this.showCorpUsers = false;
    this.selectedCorpForUsers = null;
    this.navService.setTitle('Corporations');
    this.navService.setSubtitle('Manage your corporations');
  }

  getResourceTitle(resourceId: string): string {
    const resource = this.allResources.find(r => r.resource_id === resourceId);
    return resource ? resource.title : resourceId;
  }

  onOrgSearch(): void {
    if (this.orgSearchLoading) return;
    
    const orgNumber = this.corpForm.get('organization_number')?.value;
    if (!orgNumber) {
      this.toastr.error('Please enter an organization number');
      return;
    }

    // In edit mode, prevent searching if the organization number is the same as the original
    if (this.isEditMode && orgNumber === this.selectedCorporation?.organization_number) {
      this.toastr.info('This is the current organization number');
      return;
    }

    this.orgSearchLoading = true;
    
    // Use public search method in edit mode to avoid authentication issues
    const searchMethod = this.isEditMode 
      ? this.corporationService.publicSearchOrganization(orgNumber)
      : this.corporationService.searchOrganization(orgNumber);

    searchMethod.subscribe({
      next: (response) => {
        if (response.success) {
          const autoFillFields = [
            'corp_name',
            'street_address',
            'registered_city',
            'postal_code',
            'city',
            'company_email',
            'company_phone'
          ];

          // Re-enable all org fields before autofill (in case user searches again)
          autoFillFields.forEach(field => this.corpForm.get(field)?.enable());

          // Only patch and disable fields that have a value
          const orgData: any = response.data;
          autoFillFields.forEach(field => {
            const value = orgData[field];
            if (value && value.trim() !== '') {
              this.corpForm.get(field)?.patchValue(value);
              
              // In edit mode, only disable if the value is different from the current value
              if (!this.isEditMode) {
                this.corpForm.get(field)?.disable();
              } else {
                const currentValue = this.selectedCorporation?.[field];
                if (currentValue !== value) {
              this.corpForm.get(field)?.disable();
                }
              }
            } else {
              this.corpForm.get(field)?.patchValue(''); // Clear if empty
              this.corpForm.get(field)?.enable();
            }
          });

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

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loading = true;
      this.loadCorporations();
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
    return Array.from(new Set(pages.filter((p) => p > 0 && p <= tp))).sort((a, b) => a - b);
  }

  // Add a method to help debug form values
  private logFormValues(): void {
    console.log('Current Form Values:', this.corpForm.getRawValue());
    console.log('Form Validity:', this.corpForm.valid);
    console.log('Selected Resources:', Array.from(this.selectedResources));
  }
}