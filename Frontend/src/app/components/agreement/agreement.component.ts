import { Component, OnInit, ViewChild, OnDestroy, ElementRef } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { trigger, transition, style, animate } from "@angular/animations";
import { ToastrService } from "ngx-toastr";
import {
  CdkDragDrop,
  moveItemInArray,
  CdkDropList,
} from "@angular/cdk/drag-drop";
import { AgreementService } from '../../shared/service/agreement/agreement.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, switchMap, map, finalize } from 'rxjs/operators';
import { timer } from 'rxjs';
import { Router } from '@angular/router';
import { SelectOption } from '../../shared/components/custom-select/custom-select.component';

// Status enums for advanced filter
export enum AgreementStatus {
  ACTIVE = "Active",
  PENDING = "Pending",
  INACTIVE = "Inactive",
  SOLD = "Sold",
  RESERVED = "Reserved",
  DRAFT = "Draft"
}

export const AgreementStatusDisplay: Record<string, string> = {
  Active: "Active",
  Pending: "Pending",
  Inactive: "Inactive",
  Sold: "Sold",
  Reserved: "Reserved",
  Draft: "Draft"
};

// Interfaces for new data structure
interface LeadStatus {
  avatar: string;
  name: string;
  type: string;
  status: string;
  update: string;
}

interface FollowUpTask {
  avatar: string;
  name: string;
  date: string;
  note?: string;
}

interface DocumentItem {
  name: string;
  date?: string;
  uploadedAt?: string | Date;
  url?: string;
  type?: string;
  size?: number;
  uploadedBy?: string;
}

interface ContractInfo {
  avatar: string;
  name: string;
  group: string;
  address: string;
  phone: string;
  email: string;
  status: string;
  type: string;
  startDate: string;
  endDate: string;
  lastProspecting: string[];
  timeline: string[];
}

interface CustomerInfo {
  [key: string]: any;
  name: string;
  customerNumber: string;
  email: string;
  telephone: string;
  address: string;
  customerType: string;
  organizationNumber: string;
  socialSecurityNumber: string;
  status: string;
}

interface VehicleInfo {
  [key: string]: any;
  registrationNumber: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  chassisNumber: string;
  mileage: number;
  status: string;
}

interface SalesInfo {
  [key: string]: any;
  salesPrice: number;
  paymentMethod: string;
  vatType: string;
  numberOfKeys: string;
  deck: string;
  insurer: string;
  insuranceType: string;
  warrantyProvider: string;
  warrantyProduct: string;
  freeTextPayment: string;
  financing?: {
    creditor: string;
    creditAmount: number;
    loanPeriod: number;
    cashBet: string;
  };
  leasing?: {
    provider: string;
    amount: number;
    period: number;
  } | null;
  tradeInVehicle?: {
    registrationNumber: string;
    purchaseDate: string;
    purchasePrice: number;
    mileage: number;
    creditMarking: string;
    creditor?: string;
    creditAmount?: number;
    vehicleDetails?: any;
  };
}

interface PersonDetail {
  [key: string]: any;  // Add index signature
  _type: string;
  id: string;
  country: string;
  legalId: string;
  birthDate: string;
  gender: string;
  name: {
    names: string[];
    lastName: string;
    givenName: string;
  };
  addresses: Array<{
    street: string;
    number: string;
    zip: string;
    city: string;
  }>;
}

interface OrganizationDetail {
  [key: string]: any;  // Add index signature
  organization_number: string;
  corp_name: string;
  street_address: string;
  registered_city: string;
  postal_code: string;
  city: string;
  company_email: string;
  company_phone: any;
}

// Vehicle Status Enum
export enum VehicleStatus {
  IN_USE = "IN_USE",
  NOT_IN_USE = "NOT_IN_USE",
  SOLD = "SOLD",
  RESERVED = "RESERVED",
  DRAFT = "DRAFT"
}

// Vehicle Status Display Names
export const VehicleStatusDisplay: Record<VehicleStatus, string> = {
  IN_USE: "Active",
  NOT_IN_USE: "Inactive",
  SOLD: "Sold",
  RESERVED: "Reserved",
  DRAFT: "Draft"
};

// Vehicle Status Colors
export const VehicleStatusColors: Record<VehicleStatus, string> = {
  IN_USE: "bg-green-100 text-green-700",
  NOT_IN_USE: "bg-gray-100 text-gray-700",
  SOLD: "bg-red text-red",
  RESERVED: "bg-yellow-100 text-yellow-700",
  DRAFT: "bg-gray-200 text-gray-700"
};

// Vehicle Interface
export interface Vehicle {
  _id: string;
  _type: string;
  vehicleId: string;
  id: string;
  country: string;
  legalId: string;
  registrationData: {
    registrationNumber: string;
    registeredOn: string;
  };
  detail: {
    vehicleType: string;
    color: string;
    chassisNumber: string;
    modelNumber: string;
    registrationDate: string;
    registrationNumberReused: boolean;
    vehicleBrandRaw: string;
    vehicleYear: string;
  };
  ownerInfo: {
    identityNumber: string;
    acquisitionDate: string;
    organization: boolean;
    numberOfUsers: number;
    owner: string;
    ownerAcquisitionDate: string;
    userReference: {
      _type: string;
      id: string;
      country: string;
      addresses: any[];
    };
  };
  status: {
    registrationType: string;
    date: string;
    leased: boolean;
    methodsOfUse: string[];
    code: VehicleStatus;
    insuranceType?: string;
  };
  technicalData: {
    bodyCode1: string;
    nrOfPassengers: number;
    serviceWeight: number;
    totalWeight: number;
    allWheelDrive: boolean;
    fuelCodes: string[];
  };
}

// Column Settings Interface
interface ColumnSettings {
  selectedColumns: string[];
  availableColumns: string[];
}

// Add AgreementType enum
export enum AgreementType {
  SALE = "Sales",
  PURCHASE = "Purchase",
  LEASE = "Lease",
}

export const AgreementTypeDisplay: Record<string, string> = {
  Sales: "Sales",
  Purchase: "Purchase",
  Lease: "Lease",
};

@Component({
  selector: "app-agreement",
  styleUrls: ['./agreement.component.scss'],
  templateUrl: "./agreement.component.html",
  animations: [
    trigger("modalAnimation", [
      transition(":enter", [
        style({ opacity: 0 }),
        animate("300ms ease-out", style({ opacity: 1 })),
      ]),
      transition(":leave", [animate("300ms ease-in", style({ opacity: 0 }))]),
    ]),
    trigger("fadeInOut", [
      transition(":enter", [
        style({ opacity: 0 }),
        animate("150ms ease-out", style({ opacity: 1 })),
      ]),
      transition(":leave", [animate("150ms ease-in", style({ opacity: 0 }))]),
    ]),
  ],
})
export class AgreementComponent implements OnInit, OnDestroy {
  agreements: any[] = [];
  filteredAgreements: any[] = [];
  paginatedAgreements: any[] = [];
  expandedRowKey: string | null = null;
  filterForm: FormGroup;
  vehicleForm: FormGroup;
  isVisible = false;
  showDeleteModal = false;
  loading = false;
  addingVehicle = false;
  activeTab = "reg";
  showColumnSettings = false;
  showAdvancedSearchPanel = false;
  showAgreementDropdown = false;
  currentPage = 1;
  itemsPerPage = 15;
  totalItems = 0;
  Math = Math;
  Object = Object;
  COLUMN_SETTINGS_KEY: string = "agreement_columns";
  selectedColumns: string[] = [];
  availableColumns: string[] = [];
  loadingError: string | null = null;
  @ViewChild("importFile") importFile: any;
  @ViewChild("selectedList") selectedList!: CdkDropList;
  @ViewChild('documentUploadInput', { static: false }) documentUploadInput: ElementRef | null = null;
  uploadingDocument = false;

  AgreementStatus = AgreementStatus;
  AgreementStatusDisplay = AgreementStatusDisplay;
  AgreementType = AgreementType;
  AgreementTypeDisplay = AgreementTypeDisplay;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Add stats property
  stats: {
    purchaseAgreements: number;
    salesAgreements: number;
    brokerageAgreements: number;
    purchasedVehicles: number;
    soldVehicles: number;
    brokeredVehicles: number;
  } = {
    purchaseAgreements: 0,
    salesAgreements: 0,
    brokerageAgreements: 0,
    purchasedVehicles: 0,
    soldVehicles: 0,
    brokeredVehicles: 0
  };

  // Add a property to track API-returned total pages
  private _apiTotalPages = 0;

  private readonly MINIMUM_LOADING_TIME = 250;

  agreementToDelete: any | null = null;
  deleteLoading = false;

  statusOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'Active', label: 'Active' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Sold', label: 'Sold' },
    { value: 'Reserved', label: 'Reserved' },
    { value: 'Draft', label: 'Draft' }
  ];

  agreementTypeOptions: SelectOption[] = [
    { value: '', label: 'All Agreement Types' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Purchase', label: 'Purchase' },
    { value: 'Agency', label: 'Agency' },
    { value: 'Receipt', label: 'Receipt' }
  ];

  // Add this property to track which trade-in vehicle section is expanded
  expandedTradeInVehicle: string | null = null;

  constructor(
    private fb: FormBuilder, 
    private toastr: ToastrService,
    private agreementService: AgreementService,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      searchTerm: [""],
      statusAdv: [""],
      typeAdv: [""],
      fromDate: [""],
      toDate: [""],
    });
    this.vehicleForm = this.fb.group({ vehicleId: ["", Validators.required] });
    this.loadColumnSettings();
    this.setupSearchDebounce();
  }

  ngOnInit(): void {
    this.loadAgreements();
  }

  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300), // Wait for 300ms after the last keystroke
      distinctUntilChanged(), // Only emit if the value has changed
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.currentPage = 1;
      this.loadAgreements();
    });
  }

  onSearchInput(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.searchSubject.next(searchTerm);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAgreements(): void {
    this.loading = true;
    const loadingTimer$ = timer(this.MINIMUM_LOADING_TIME);
    const filters = this.getFilterParams();
    this.agreementService.getAgreements(
      this.currentPage,
      this.itemsPerPage, 
      filters
    ).pipe(
      takeUntil(this.destroy$),
      // Wait for at least MINIMUM_LOADING_TIME
      switchMap((response) => loadingTimer$.pipe(map(() => response)))
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.paginatedAgreements = response.data;
          console.log(this.paginatedAgreements)
          this.totalItems = response.totalItems;
          this._apiTotalPages = response.totalPages;
          if (response.stats) {
            this.stats = response.stats;
          }
         
        } else {
          this.toastr.error(response.message || 'Failed to load agreements');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading agreements:', error);
        this.toastr.error('Failed to load agreements');
        this.loading = false;
      }
    });
  }

  // Helper method to get filter parameters
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

  // Load column settings from localStorage
  private loadColumnSettings() {
    const savedSettings = localStorage.getItem(this.COLUMN_SETTINGS_KEY);
    const defaultColumns = [
      'Reg. No.', 
      'Name', 
      'Telephone', 
      'Business', 
      'Date', 
      'Status', 
      'Agreement Type'
    ];

    const defaultAvailableColumns = [
      'Customer Type', 
      'Organization Number', 
      'Company Name', 
      'Sales Price', 
      'Payment Method', 
      'VAT Type', 
      'Mileage', 
      'Warranty Provider', 
      'Warranty Product',
      'Vehicle ID', 
      'Corporation ID', 
      'Legal ID', 
      'Registration Type', 
      'Status Code', 
      'Inspection Mileage',
      'Equipment Count',
      'Fuel Codes',
      'Methods of Use'
    ];

    if (savedSettings) {
      try {
        const parsedSettings: ColumnSettings = JSON.parse(savedSettings);
        this.selectedColumns = parsedSettings.selectedColumns || defaultColumns;
        this.availableColumns = parsedSettings.availableColumns || defaultAvailableColumns;
      } catch (error) {
        // If parsing fails, use default settings
        this.selectedColumns = defaultColumns;
        this.availableColumns = defaultAvailableColumns;
      }
    } else {
      // Use default settings
      this.selectedColumns = defaultColumns;
      this.availableColumns = defaultAvailableColumns;
    }
  }

  // Move column from available to selected
  addColumn(column: string) {
    if (this.selectedColumns.length < 6) {
      this.selectedColumns = [...this.selectedColumns, column];
      this.availableColumns = this.availableColumns.filter(
        (col) => col !== column
      );
    } else {
      this.toastr.warning("You can have maximum 6 columns selected");
    }
  }

  // Move column from selected to available
  removeColumn(index: number) {
    const column = this.selectedColumns[index];
    this.selectedColumns = this.selectedColumns.filter((_, i) => i !== index);
    this.availableColumns = [...this.availableColumns, column];
  }

  // Drag and drop handler
  onColumnDrop(event: CdkDragDrop<string[]>) {
    if (event.previousIndex !== event.currentIndex) {
      moveItemInArray(
        this.selectedColumns,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  // Save column settings to localStorage
  public saveColumnSettings(): void {
    const settings: ColumnSettings = {
      selectedColumns: this.selectedColumns,
      availableColumns: this.availableColumns,
    };
    localStorage.setItem(this.COLUMN_SETTINGS_KEY, JSON.stringify(settings));
    this.showColumnSettings = false;
    this.toastr.success("Column settings saved successfully");
  }

  getRowKey(agreement: any, index: number): string {
    return `${agreement['_id'] || index}`;
  }

  toggleAccordion(rowKey: string): void {
    this.expandedRowKey = this.expandedRowKey === rowKey ? null : rowKey;
  }

  onSimpleSearch(): void {
    this.currentPage = 1;
    this.loadAgreements();
  }

  applyAdvancedSearch(): void {
    this.currentPage = 1;
    this.loadAgreements();
    this.showAdvancedSearchPanel = false;
  }

  resetAdvancedFilters(): void {
    this.filterForm.patchValue({
      statusAdv: "",
      typeAdv: "",
      fromDate: "",
      toDate: "",
    });
    this.currentPage = 1;
    this.loadAgreements();
    this.showAdvancedSearchPanel = false;
  }

  onSubmit(): void {
    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      this.toastr.error("Please fill in all required fields");
      return;
    }
    this.toastr.success("Vehicle added successfully");
    this.isVisible = false;
    this.vehicleForm.reset();
  }

  showComingSoon(): void {
    this.toastr.info("Coming soon");
  }

  openDeleteModal(agreement: any): void {
    this.agreementToDelete = agreement;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.agreementToDelete = null;
    this.deleteLoading = false;
  }

  deleteVehicle(): void {
    if (!this.agreementToDelete) return;

    this.deleteLoading = true;
    this.agreementService.deleteAgreement(this.agreementToDelete['_id']).subscribe({
      next: () => {
        this.toastr.success('Agreement deleted successfully');
        this.loadAgreements();
        this.closeDeleteModal();
      },
      error: (error) => {
        this.toastr.error('Failed to delete agreement');
        console.error('Delete error:', error);
      },
      complete: () => {
        this.deleteLoading = false;
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
      this.loadAgreements();
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

  private normalizeVehicleStatus(status: string): string {
    if (!status) return 'IN_USE';
    const upper = status.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(VehicleStatusDisplay, upper)) return upper;
    if (upper === 'DRAFT') return 'DRAFT';
    if (upper === 'IN USE') return 'IN_USE';
    if (upper === 'NOT IN USE') return 'NOT_IN_USE';
    if (upper === 'SOLD') return 'SOLD';
    if (upper === 'RESERVED') return 'RESERVED';
    return upper;
  }

  getStatusDisplay(status: string): string {
    return status || 'N/A';
  }

  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Helper method to get object keys
  getObjectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  // Helper method to check if value is an object
  isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  // Helper method to check if value is an array
  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  // Helper method to format key names
  formatKey(key: string): string {
    // Special cases for purchase details
    const specialCases: { [key: string]: string } = {
      'registrationNumber': 'Registration Number',
      'purchaseDate': 'Purchase Date',
      'emailAddress': 'Email Address',
      'telephoneNumber': 'Telephone Number',
      'purchasePrice': 'Purchase Price',
      'paymentMethod': 'Payment Method',
      'vatType': 'VAT Type',
      'creditMarking': 'Credit Marking',
      'mileage': 'Mileage',
      'service': 'Service',
      'numberOfKeys': 'Number of Keys',
      'deck': 'Deck',
      'notes': 'Notes'
    };

    // Check if it's a special case
    if (specialCases[key]) {
      return specialCases[key];
    }

    // Default formatting for other keys
    return key
      .split(/(?=[A-Z])|_/)  // Split on capital letters or underscores
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Safe property access method for template
  getPropertyValue(obj: any, key: string): any {
    if (!obj) return 'N/A';
    const value = obj[key];
    return value !== undefined ? value : 'N/A';
  }

  // Update the getAgreementCellValue method
  getAgreementCellValue(agreement: any, col: string): any {
    if (!agreement) return 'N/A';

    switch(col) {
      case 'Reg. No.':
        return agreement.vehicle_id?.registrationData?.registrationNumber || agreement.registrationNumber || 'N/A';
      case 'Name':
        return agreement.customer_id?.name || 'N/A';
      case 'Email':
        return agreement.customer_id?.email || agreement.emailAddress || 'N/A';
      case 'Telephone':
        return agreement.customer_id?.telephone || agreement.telephoneNumber || 'N/A';
      case 'Business':
        return agreement.customerType || 'N/A';
      case 'Date':
        // Handle different date fields based on agreement type
        switch(agreement.agreementType) {
          case 'Purchase':
            return agreement.purchase_details?.purchaseDate ? 
              new Date(agreement.purchase_details.purchaseDate).toLocaleDateString() : 'N/A';
          case 'Sales':
            return agreement.sales_details?.salesDate ? 
              new Date(agreement.sales_details.salesDate).toLocaleDateString() : 'N/A';
          case 'Agency':
            return agreement.agency_details?.agencyDate ? 
              new Date(agreement.agency_details.agencyDate).toLocaleDateString() : 'N/A';
          case 'Receipt':
            return agreement.receipt_details?.date ? 
              new Date(agreement.receipt_details.date).toLocaleDateString() : 'N/A';
          default:
            return 'N/A';
        }
      case 'Status':
        return agreement.customer_id?.status || agreement.vehicle_id?.status?.code || 'N/A';
      case 'Agreement Type':
        return agreement.agreementType || 'N/A';
      case 'Customer Type':
        return agreement.customerType || 'N/A';
      case 'Organization Number':
        return agreement.customer_id?.company_details?.organization_number || agreement.organizationNumber || 'N/A';
      case 'Company Name':
        return agreement.customer_id?.company_details?.corp_name || 'N/A';
      case 'Sales Price':
        if (agreement.agreementType === 'Sales') {
          return agreement.sales_details?.salesPrice || 'N/A';
        } else if (agreement.agreementType === 'Purchase') {
          return agreement.purchase_details?.purchasePrice || 'N/A';
        } else if (agreement.agreementType === 'Agency') {
          return agreement.agency_details?.salesPrice || 'N/A';
        }
        return 'N/A';
      case 'Payment Method':
        switch(agreement.agreementType) {
          case 'Purchase':
            return agreement.purchase_details?.paymentMethod || 'N/A';
          case 'Sales':
            return agreement.sales_details?.paymentMethod || 'N/A';
          case 'Agency':
            return agreement.agency_details?.paymentMethod || 'N/A';
          default:
            return 'N/A';
        }
      case 'VAT Type':
        switch(agreement.agreementType) {
          case 'Purchase':
            return agreement.purchase_details?.vatType || 'N/A';
          case 'Sales':
            return agreement.sales_details?.vatType || 'N/A';
          case 'Agency':
            return agreement.agency_details?.vatType || 'N/A';
          default:
            return 'N/A';
        }
      case 'Mileage':
        if (agreement.agreementType === 'Agency') {
          return agreement.agency_details?.mileage || 'N/A';
        }
        return agreement.vehicle_id?.inspection?.mileage || 
               (agreement.agreementType === 'Purchase' ? agreement.purchase_details?.mileage : 'N/A');
      case 'Warranty Provider':
        return agreement.sales_details?.warrantyProvider || 'N/A';
      case 'Warranty Product':
        return agreement.sales_details?.warrantyProduct || 'N/A';
      case 'Vehicle ID':
        return agreement.vehicle_id?.vehicleId || 'N/A';
      case 'Corporation ID':
        return agreement.corp_id || 'N/A';
      case 'Legal ID':
        return agreement.vehicle_id?.legalId || 'N/A';
      case 'Registration Type':
        return agreement.vehicle_id?.status?.registrationType || 'N/A';
      case 'Status Code':
        return agreement.vehicle_id?.status?.code || 'N/A';
      case 'Inspection Mileage':
        return agreement.vehicle_id?.inspection?.mileage || 'N/A';
      case 'Equipment Count':
        return agreement.vehicle_id?.equipment?.length || 0;
      case 'Fuel Codes':
        return agreement.vehicle_id?.technicalData?.fuelCodes?.join(', ') || 'N/A';
      case 'Methods of Use':
        return agreement.vehicle_id?.status?.methodsOfUse?.join(', ') || 'N/A';
      default:
        return 'N/A';
    }
  }

  viewDocument(agreement: any, doc: { url?: string }): void {
    if (doc.url) {
      window.open(doc.url, '_blank');
    } else {
      this.toastr.warning('Document URL not available');
    }
  }

  downloadDocument(agreement: any, doc: { url?: string }): void {
    if (doc.url) {
      window.open(doc.url, '_blank');
    } else {
      this.toastr.warning('Document URL not available');
    }
  }

  signAgreement(agreement: any): void {
    // Navigate to the sign agreement page
    this.router.navigate(['/sign', agreement['_id']]);
  }

  editAgreement(agreement: any): void {
    switch(agreement.agreementType) {
      case 'Sales':
        this.router.navigate(['/dashboard/sales-agreement/edit', agreement['_id']]);
        break;
      case 'Purchase':
        this.router.navigate(['/dashboard/purchase-agreement/edit', agreement['_id']]);
        break;
      case 'Agency':
        this.router.navigate(['/dashboard/agency-agreement/edit', agreement['_id']]);
        break;
      case 'Receipt':
        this.toastr.info("Not implemented Yet");
        break;
      default:
        this.toastr.warning('Edit not supported for this agreement type');
    }
  }

  shareAgreementLink(agreement: any): void {
    // Implementation
    this.toastr.info('Share link functionality coming soon');
  }

  sendEmail(agreement: any): void {
    // Implementation
    this.toastr.info('Send email functionality coming soon');
  }

  navigateToSwish(agreement: any): void {
    // Navigate to Swish payment with agreement context
    this.router.navigate(['/dashboard/swish/add'], {
      queryParams: {
        agreementId: agreement['_id'],
        customerName: this.getPropertyValue(agreement, 'name'),
        reference: agreement['_id']
      }
    });
  }

  onDocumentUpload(event: any, agreement: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type and size
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      this.toastr.error('Invalid file type. Allowed types: PDF, JPEG, PNG, DOC, DOCX');
      return;
    }

    if (file.size > maxSize) {
      this.toastr.error('File size exceeds 10MB limit');
      return;
    }

    this.uploadingDocument = true;
    this.agreementService.uploadDocument(agreement['_id'], file)
      .pipe(
        finalize(() => {
          this.uploadingDocument = false;
          // Reset file input
          if (this.documentUploadInput) {
            this.documentUploadInput.nativeElement.value = '';
          }
        })
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success('Document uploaded successfully');
            // Reload agreement details to refresh documents
            this.loadAgreements();
          } else {
            this.toastr.error(response.message || 'Failed to upload document');
          }
        },
        error: (error) => {
          console.error('Document upload error:', error);
          this.toastr.error('Failed to upload document');
        }
      });
  }

  triggerDocumentUpload(agreement: any): void {
    // Programmatically trigger file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
    input.onchange = (event: any) => this.onDocumentUpload(event, agreement);
    input.click();
  }

  // Update getCustomerInfoValue method
  getCustomerInfoValue(agreement: any): any {
    if (!agreement.customer_id) return {};
    
    const customer = agreement.customer_id;
    const baseInfo = {
      'Name': customer.name,
      'Email': customer.email,
      'Telephone': customer.telephone,
      'Address': customer.address,
      'Status': customer.status
    };

    // Handle company customer type
    if (customer.customerType === 'Company' && customer.company_details) {
      return {
        ...baseInfo,
        'Organization Number': customer.company_details.organization_number || 'N/A',
        'Company Name': customer.company_details.corp_name || 'N/A',
        'Street Address': customer.company_details.street_address || 'N/A',
        'Postal Code': customer.company_details.postal_code || 'N/A',
        'City': customer.company_details.city || 'N/A',
        'Registered City': customer.company_details.registered_city || 'N/A',
        'Business Category': customer.company_details.business_category || 'N/A',
        'Legal Form': customer.company_details.legal_form || 'N/A',
        'Contact Person': customer.company_details.contact_person || 'N/A'
      };
    }
    
    // Handle private individual customer type
    if (customer.customerType === 'Private Individual' && customer.person_details) {
      return {
        ...baseInfo,
        'Social Security Number': customer.person_details.socialSecurityNumber || agreement.socialSecurityNumber || 'N/A',
        'Birth Date': customer.person_details.birthDate ? new Date(customer.person_details.birthDate).toLocaleDateString() : 'N/A',
        'Gender': customer.person_details.gender || 'N/A'
      };
    }

    // Return base info if no specific details are available
    return baseInfo;
  }

  getVehicleInfoValue(agreement: any): any {
    if (!agreement.vehicle_id && !agreement.registrationNumber) return {};

    // For agency agreements
    if (agreement.agreementType === 'Agency') {
      const vehicle = agreement.vehicle_id;
      const agencyDetails = agreement.agency_details;
      const history = vehicle?.agreementHistory?.[0] || {};

      return {
        'Registration Number': agencyDetails?.registrationNumber || vehicle?.legalId || 'N/A',
        'Mileage': agencyDetails?.mileage || 'N/A',
        'Number of Keys': agencyDetails?.numberOfKeys || 'N/A',
        'Deck': agencyDetails?.deck || 'N/A',
        'Base Price': history?.basePrice ? `${history.basePrice} SEK` : 'N/A',
        'Status': vehicle?.status?.code || 'AGENCY',
        'Legal ID': vehicle?.legalId || 'N/A',
        'Created Date': vehicle?.createdAt ? new Date(vehicle.createdAt).toLocaleDateString() : 'N/A',
        'Updated Date': vehicle?.updatedAt ? new Date(vehicle.updatedAt).toLocaleDateString() : 'N/A',
        'Agreement Type': history?.agreementType || 'N/A',
        'Methods of Use': vehicle?.status?.methodsOfUse?.join(', ') || 'N/A',
        'Technical Data': {
          'Coupling Devices': vehicle?.technicalData?.couplingDevices?.join(', ') || 'N/A',
          'Fuel Codes': vehicle?.technicalData?.fuelCodes?.join(', ') || 'N/A'
        }
      };
    }

    // For other agreement types with full vehicle details
    if (!agreement.vehicle_id) return {};
    const vehicle = agreement.vehicle_id;
    
    return {
      'Registration Number': vehicle.registrationData?.registrationNumber || vehicle.legalId || 'N/A',
      'Registration Date': vehicle.registrationData?.registeredOn ? new Date(vehicle.registrationData.registeredOn).toLocaleDateString() : 'N/A',
      'Brand': vehicle.detail?.vehicleBrand || 'N/A',
      'Model': vehicle.detail?.vehicleBrandRaw || 'N/A',
      'Year': vehicle.detail?.vehicleYear || 'N/A',
      'Color': vehicle.detail?.color || 'N/A',
      'Chassis Number': vehicle.detail?.chassisNumber || 'N/A',
      'Vehicle Type': vehicle.detail?.vehicleType || 'N/A',
      'Vehicle Category': vehicle.detail?.vehicleCategory || 'N/A',
      'Status': vehicle.status?.code || 'N/A',
      'Mileage': vehicle.inspection?.mileage || 'N/A',
      'Inspection Date': vehicle.inspection?.inspectionDate ? new Date(vehicle.inspection.inspectionDate).toLocaleDateString() : 'N/A',
      'Inspection Station': vehicle.inspection?.inspectionStation || 'N/A',
      'Service Weight': vehicle.technicalData?.serviceWeight || 'N/A',
      'Total Weight': vehicle.technicalData?.totalWeight || 'N/A',
      'Number of Passengers': vehicle.technicalData?.nrOfPassengers || 'N/A',
      'Gearbox': vehicle.technicalData?.gearbox || 'N/A',
      'All Wheel Drive': vehicle.technicalData?.allWheelDrive ? 'Yes' : 'No',
      'Fuel Type': vehicle.technicalData?.fuelCodes?.join(', ') || 'N/A'
    };
  }

  getSalesInfoValue(agreement: any): any {
    if (!agreement.sales_details) return {};
    return {
      salesPrice: agreement.sales_details.salesPrice,
      paymentMethod: agreement.sales_details.paymentMethod,
      vatType: agreement.sales_details.vatType,
      numberOfKeys: agreement.sales_details.numberOfKeys,
      deck: agreement.sales_details.deck,
      insurer: agreement.sales_details.insurer,
      insuranceType: agreement.sales_details.insuranceType,
      warrantyProvider: agreement.sales_details.warrantyProvider,
      warrantyProduct: agreement.sales_details.warrantyProduct,
      freeTextPayment: agreement.sales_details.freeTextPayment,
      financing: agreement.sales_details.financing,
      tradeInVehicle: agreement.sales_details.tradeInVehicle
    };
  }

  // Helper method to check if a value is meaningful (not 'N/A' or empty)
  isMeaningfulValue(value: any): boolean {
    return value !== 'N/A' && value !== '' && value !== null && value !== undefined;
  }

  // Update getAgreementInfoValue method to handle different agreement types
  getAgreementInfoValue(agreement: any): any {
    if (!agreement) return {};

    const baseInfo = {
      'Registration Number': agreement.vehicle_id?.registrationData?.registrationNumber || agreement.registrationNumber,
      'Email': agreement.customer_id?.email || agreement.emailAddress,
      'Telephone': agreement.customer_id?.telephone || agreement.telephoneNumber
    };

    switch (agreement.agreementType) {
      case 'Purchase':
        return {
          ...baseInfo,
          'Purchase Date': agreement.purchase_details?.purchaseDate ? 
            new Date(agreement.purchase_details.purchaseDate).toLocaleDateString() : 'N/A',
          'Purchase Price': agreement.purchase_details?.purchasePrice,
          'Payment Method': agreement.purchase_details?.paymentMethod,
          'VAT Type': agreement.purchase_details?.vatType,
          'Credit Marking': agreement.purchase_details?.creditMarking,
          'Mileage': agreement.purchase_details?.mileage,
          'Service': agreement.purchase_details?.service,
          'Number of Keys': agreement.purchase_details?.numberOfKeys,
          'Deck': agreement.purchase_details?.deck,
          'Notes': agreement.purchase_details?.notes
        };

      case 'Sales':
        return {
          ...baseInfo,
          'Sales Date': agreement.sales_details?.salesDate ? 
            new Date(agreement.sales_details.salesDate).toLocaleDateString() : 'N/A',
          'Sales Price': agreement.sales_details?.salesPrice,
          'Payment Method': agreement.sales_details?.paymentMethod,
          'VAT Type': agreement.sales_details?.vatType,
          'Number of Keys': agreement.sales_details?.numberOfKeys,
          'Deck': agreement.sales_details?.deck,
          'Insurer': agreement.sales_details?.insurer,
          'Insurance Type': agreement.sales_details?.insuranceType,
          'Warranty Provider': agreement.sales_details?.warrantyProvider,
          'Warranty Product': agreement.sales_details?.warrantyProduct,
          'Free Text Payment': agreement.sales_details?.freeTextPayment
        };

      case 'Agency':
        const agencyDetails = agreement.agency_details;
        return {
          ...baseInfo,
          'Agency Date': agencyDetails?.agencyDate ? 
            new Date(agencyDetails.agencyDate).toLocaleDateString() : 'N/A',
          'Sales Price': agencyDetails?.salesPrice ? `${agencyDetails.salesPrice} SEK` : 'N/A',
          'Commission Rate': agencyDetails?.commissionRate ? `${agencyDetails.commissionRate}%` : 'N/A',
          'Commission Amount': agencyDetails?.commissionAmount ? `${agencyDetails.commissionAmount} SEK` : 'N/A',
          'Agency Fee': agencyDetails?.agencyFee ? `${agencyDetails.agencyFee} SEK` : 'N/A',
          'Payment Method': agencyDetails?.paymentMethod || 'N/A',
          'VAT Type': agencyDetails?.vatType || 'N/A',
          'Mileage': agencyDetails?.mileage || 'N/A',
          'Number of Keys': agencyDetails?.numberOfKeys || 'N/A',
          'Deck': agencyDetails?.deck || 'N/A',
          'Notes': agencyDetails?.notes || 'N/A',
          'Buyer Name': agencyDetails?.buyer?.name || 'N/A',
          'Buyer Organization': agencyDetails?.buyer?.organizationName || 'N/A',
          'Buyer Organization Number': agencyDetails?.buyer?.organizationNumber || 'N/A',
          'Buyer Email': agencyDetails?.buyer?.email || 'N/A',
          'Buyer Phone': agencyDetails?.buyer?.phone || 'N/A',
          'Buyer Address': agencyDetails?.buyer?.address || 'N/A',
          'Buyer Business Category': agencyDetails?.buyer?.businessCategory || 'N/A',
          'Buyer Legal Form': agencyDetails?.buyer?.legalForm || 'N/A'
        };

      case 'Receipt':
        return {
          ...baseInfo,
          'Receipt Date': agreement.receipt_details?.date ? 
            new Date(agreement.receipt_details.date).toLocaleDateString() : 'N/A',
          'Amount': agreement.receipt_details?.amount,
          'Payment Type': agreement.receipt_details?.paymentType,
          'Description': agreement.receipt_details?.description
        };

      default:
        return baseInfo;
    }
  }

  // Update getTradeInVehicleDetails method to properly format trade-in vehicle info
  getTradeInVehicleDetails(tradeInVehicle: any): any {
    if (!tradeInVehicle?.vehicleDetails) return {};
    const details = tradeInVehicle.vehicleDetails;
    return {
      'Registration Number': details.registrationData?.registrationNumber,
      'Brand': details.detail?.vehicleBrand,
      'Model': details.detail?.vehicleModelRaw || details.detail?.vehicleBrandRaw,
      'Year': details.detail?.vehicleYear,
      'Color': details.detail?.color,
      'Chassis Number': details.detail?.chassisNumber,
      'Registration Date': details.registrationData?.registeredOn ? new Date(details.registrationData.registeredOn).toLocaleDateString() : 'N/A',
      'Mileage': details.inspection?.mileage,
      'Purchase Date': tradeInVehicle.purchaseDate ? new Date(tradeInVehicle.purchaseDate).toLocaleDateString() : 'N/A',
      'Purchase Price': tradeInVehicle.purchasePrice,
      'Credit Marking': tradeInVehicle.creditMarking,
      'Creditor': tradeInVehicle.creditor || 'N/A',
      'Credit Amount': tradeInVehicle.creditAmount || 'N/A',
      'Vehicle Type': details.detail?.vehicleType,
      'Vehicle Category': details.detail?.vehicleCategory,
      'Gearbox': details.technicalData?.gearbox || 'N/A',
      'Service Weight': details.technicalData?.serviceWeight,
      'Total Weight': details.technicalData?.totalWeight,
      'Fuel Type': details.technicalData?.fuelCodes?.join(', ') || 'N/A'
    };
  }

  // Add this method to toggle the trade-in vehicle section
  toggleTradeInVehicle(agreementId: string): void {
    this.expandedTradeInVehicle = this.expandedTradeInVehicle === agreementId ? null : agreementId;
  }

  // Add helper methods for safe data access and formatting
  getFormattedDate(date: any): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  }

  getSafeValue(obj: any, path: string): any {
    try {
      return path.split('.').reduce((acc, part) => acc && acc[part], obj) || 'N/A';
    } catch {
      return 'N/A';
    }
  }
}
