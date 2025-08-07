import { Component, OnInit, ViewChild, OnDestroy, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { ToastrService } from 'ngx-toastr';
import { VehicleService, VehicleDocument } from '../../../shared/service/vehicle/vehicle.service';
import { LoggingService } from 'src/app/shared/service/logging.service';
import { Subject, timer, of } from 'rxjs';
import { takeUntil, finalize, catchError, switchMap, map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray, CdkDropList } from '@angular/cdk/drag-drop';
import { SelectOption } from '../../../shared/components/custom-select/custom-select.component';

// Vehicle Status Enum
export enum VehicleStatus {
  STOCK = 'STOCK',
  SOLD = 'SOLD',
  CONSIGNMENT = 'CONSIGNMENT'
}

// Vehicle Status Display Names
export const VehicleStatusDisplay: Record<VehicleStatus, string> = {
  [VehicleStatus.STOCK]: 'Stock',
  [VehicleStatus.SOLD]: 'Sold',
  [VehicleStatus.CONSIGNMENT]: 'Consignment'
};

// Vehicle Status Colors
export const VehicleStatusColors: Record<VehicleStatus, string> = {
  [VehicleStatus.STOCK]: 'bg-green-100 text-green-700',
  [VehicleStatus.SOLD]: 'bg-red text-red',
  [VehicleStatus.CONSIGNMENT]: 'bg-yellow-100 text-yellow-700'
};

// Vehicle Interface
export interface Vehicle {
  _id: string;
  vehicleId: string;
  corp_id: string;
  created_by: string;
  _type: string;
  id: string;
  country: string;
  legalId: string;
  registrationData: {
    registrationNumber: string;
    registeredOn: string;
  };
  detail: {
    vehicleType: string;
    vehicleCategory?: string;
    vehicleBrand: string;
    vehicleModel: string;
    color: string;
    chassisNumber: string;
    registrationDate: string;
    registrationNumberReused: boolean;
    vehicleImpactClass?: string;
    vehicleBrandRaw: string;
    vehicleModelRaw: string;
    vehicleYear: string;
  };
  ownerInfo: {
    identityNumber: string;
    acquisitionDate: string;
    organization: boolean;
    numberOfUsers: number;
    previousUserIdentityNumber?: string;
    previousUserAcquisitionDate?: string;
    beforePreviousUserIdentityNumber?: string;
    beforePreviousUserAcquisitionDate?: string;
    owner: string;
    ownerAcquisitionDate: string;
    userReference: {
      _type: string;
      id: string;
      country: string;
      addresses: any[];
    };
    ownerReference?: {
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
    creditPurchase?: boolean;
    code: string;
    insuranceType?: string;
  };
  origin?: {
    importerId?: string;
    preRegistrationDate?: string;
    directImport?: boolean;
  };
  technicalData: {
    variant?: string;
    version?: string;
    type?: string;
    bodyCode1: string;
    nrOfPassengers: number;
    eeg?: string;
    cylinderVolume?: number;
    gearbox?: string;
    couplingDevices?: any[];
    serviceWeight: number;
    vehicleTypeWeight?: number;
    totalWeight: number;
    allWheelDrive: boolean;
    maxSpeed?: string;
    fuelCodes: string[];
  };
  equipment?: Array<{
    type: string;
    value: string;
  }>;
  environmental?: {
    environmentalClassEuro?: string;
    emissionClass?: string;
    superGreenCar?: boolean;
  };
  inspection?: {
    inspectionDate?: string;
    inspectionDateUpToAndIncluding?: string;
    mileage?: number;
    inspectionStation?: string;
  };
  media?: Array<{
    url: string;
    datetime: string;
    created_by: string;
    referance_resource: string;
    name: string;
    type?: string;
  }>;
  notes?: Array<{
    content: string;
    _id: string;
  }>;
  agreementHistory?: Array<{
    agreement_id: string;
    agreementType: string;
    buyerName: string;
    basePrice: number;
    purchasePrice: number;
    vatStatus: string;
    creditLeasing: string;
    deck: string;
    deliveryTerms: string;
    deliveryLocation: string;
    inspectionDate: string | null;
    _id: string;
  }>;
  createdAt: string;
  updatedAt: string;
  __v: number;
  note?: string;
  modelYear?: string;
  mileage?: number;
  fuel?: string;
  gearbox?: string;
  lastService?: string;
  numberOfKeys?: number;
  deck?: string;
  deliveryLocation?: string;
  deliveryTerms?: string;
}

// Column Settings Interface
interface ColumnSettings {
  selectedColumns: string[];
  availableColumns: string[];
}

@Component({
  selector: 'app-warehouse',
  templateUrl: './warehouse.component.html',
  animations: [
    trigger('modalAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('150ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class WarehouseComponent implements OnInit, OnDestroy {
  vehicles: Vehicle[] = [];
  filteredVehicles: Vehicle[] = [];
  loading: boolean = false;
  detailLoading: boolean = false;
  isVisible: boolean = false;
  isEditMode: boolean = false;
  showAdvancedSearch: boolean = false;
  showAdvancedSearchPanel: boolean = false;
  showDeleteModal: boolean = false;
  vehicleForm: FormGroup;
  filterForm: FormGroup;
  @ViewChild('importFile') importFile: any;
  @ViewChild('selectedList') selectedList!: CdkDropList;
  @ViewChild('documentUploadInput', { static: false }) documentUploadInput: ElementRef | null = null;

  // Column settings
  private readonly COLUMN_SETTINGS_KEY = 'vehicle_warehouse_columns';
  selectedColumns: string[] = [];
  availableColumns: string[] = [];

  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 15;
  totalItems: number = 0;
  Math = Math;

  // Modal tab state
  activeTab: string = 'reg';

  // Accordion state
  expandedRowKey: string | null = null;
  expandedVehicle: any | null = null;
  equipmentExpandedId: string | null = null;

  // Make enums available to template
  VehicleStatus = VehicleStatus;
  VehicleStatusDisplay = VehicleStatusDisplay;
  VehicleStatusColors = VehicleStatusColors;

  private destroy$ = new Subject<void>();
  private readonly MINIMUM_LOADING_TIME = 250;
  loadingError: string | null = null;
  detailLoadingError: string | null = null;
  addingVehicle = false;
  showColumnSettings = false;

  // Add stats property
  stats: {
    soldVehicles: number;
    averageInventoryDays: number;
  } = {
    soldVehicles: 0,
    averageInventoryDays: 0
  };

  showFilterPanel = false; // Add for right-side filter panel

  uploadingDocument = false;

  statusOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'STOCK', label: 'Stock' },
    { value: 'SOLD', label: 'Sold' },
    { value: 'CONSIGNMENT', label: 'Consignment' }
  ];

  gearboxOptions: SelectOption[] = [
    { value: '', label: 'All Gearboxes' },
    { value: 'manual', label: 'Manual' },
    { value: 'automatic', label: 'Automatic' },
    { value: 'semi-automatic', label: 'Semi-Automatic' }
  ];

  fuelTypeOptions: SelectOption[] = [
    { value: '', label: 'All Fuel Types' },
    { value: 'petrol', label: 'Petrol' },
    { value: 'diesel', label: 'Diesel' },
    { value: 'electric', label: 'Electric' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'gas', label: 'Gas' }
  ];

  // Note-related properties
  showNoteModal = false;
  noteContent = '';
  noteTitle = '';
  noteIsPrivate = false;
  editingNoteId: string | null = null;
  deletingNoteId: string | null = null;

  // Outlay properties
  showOutlayModal = false;
  outlayId: string | null = null; // For editing
  outlayData = {
    name: '',
    sellerName: '',
    organizationNumber: '',
    address: '',
    location: '',
    postNumber: '',
    telephoneNumber: '',
    registrationNumber: '',
    amount: null,
    date: null,
    description: '',
    price: null,
    vat: null,
  };

  addingOutlay = false;

  addingNote = false;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private vehicleService: VehicleService,
    private loggingService: LoggingService
  ) {
    this.vehicleForm = this.fb.group({
      vehicleId: ['', Validators.required]
    });
    this.filterForm = this.fb.group({
      // Simple search
      searchTerm: [''],

      // Advanced search
      vehicleTypeAdv: [''],
      statusAdv: [''],
      modelAdv: [''],
      yearAdv: [''],

      // New filter options
      priceFrom: [''],
      priceTo: [''],
      mileageFrom: [''],
      mileageTo: [''],
      yearFrom: [''],
      yearTo: [''],
      lagerFrom: [''],
      lagerTo: [''],
      gearbox: [''],
      drivmedel: ['']
    });
    this.loadColumnSettings();
  }

  ngOnInit(): void {
    this.loadVehicles();
    this.filterForm.get('searchTerm')?.valueChanges.pipe(
      debounceTime(500), // Wait for 500ms pause in events
      distinctUntilChanged(), // Only emit if value has changed
      takeUntil(this.destroy$) // Unsubscribe on component destruction
    ).subscribe(term => {
      this.currentPage = 1;
      this.loadVehicles('simple');
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Load column settings from localStorage
  private loadColumnSettings() {
    const savedSettings = localStorage.getItem(this.COLUMN_SETTINGS_KEY);
    if (savedSettings) {
      const settings: ColumnSettings = JSON.parse(savedSettings);
      this.selectedColumns = settings.selectedColumns;
      this.availableColumns = settings.availableColumns;
    } else {
      // Default columns if no settings exist
      this.selectedColumns = [
        'Reg nr', 'Brand', 'Model', 'Type', 'Status', 'Year'
      ];
      this.availableColumns = [
        'Chassis Number', 'Color', 'Registration Date', 'Total Weight',
        'Service Weight', 'Passengers', 'Fuel Type', 'All Wheel Drive',
        'Leased', 'Registration Type'
      ];
    }
  }

  // Move column from available to selected
  addColumn(column: string) {
    if (this.selectedColumns.length < 6) {
      this.selectedColumns = [...this.selectedColumns, column];
      this.availableColumns = this.availableColumns.filter(col => col !== column);
    } else {
      this.toastr.warning('You can have maximum 6 columns selected');
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
      moveItemInArray(this.selectedColumns, event.previousIndex, event.currentIndex);
    }
  }

  // Save column settings to localStorage
  public saveColumnSettings(): void {
    const settings: ColumnSettings = {
      selectedColumns: this.selectedColumns,
      availableColumns: this.availableColumns
    };
    localStorage.setItem(this.COLUMN_SETTINGS_KEY, JSON.stringify(settings));
    this.showColumnSettings = false;
    this.toastr.success('Column settings saved successfully');
  }

  loadVehicles(searchType?: 'simple' | 'advanced'): void {
    this.loading = true;
    this.loadingError = null;

    const loadingTimer$ = timer(this.MINIMUM_LOADING_TIME);

    let filters: any = {};
    if (searchType === 'simple') {
      filters.searchTerm = this.filterForm.get('searchTerm')?.value;
    } else if (searchType === 'advanced') {
      // Log all form values for debugging
      console.log('Advanced Filter Form Values:', {
        vehicleType: this.filterForm.get('vehicleTypeAdv')?.value,
        status: this.filterForm.get('statusAdv')?.value,
        model: this.filterForm.get('modelAdv')?.value,
        year: this.filterForm.get('yearAdv')?.value,
        priceFrom: this.filterForm.get('priceFrom')?.value,
        priceTo: this.filterForm.get('priceTo')?.value,
        mileageFrom: this.filterForm.get('mileageFrom')?.value,
        mileageTo: this.filterForm.get('mileageTo')?.value,
        yearFrom: this.filterForm.get('yearFrom')?.value,
        yearTo: this.filterForm.get('yearTo')?.value,
        lagerFrom: this.filterForm.get('lagerFrom')?.value,
        lagerTo: this.filterForm.get('lagerTo')?.value,
        gearbox: this.filterForm.get('gearbox')?.value,
        drivmedel: this.filterForm.get('drivmedel')?.value
      });

      filters = {
        vehicleType: this.filterForm.get('vehicleTypeAdv')?.value,
        status: this.filterForm.get('statusAdv')?.value,
        model: this.filterForm.get('modelAdv')?.value,
        year: this.filterForm.get('yearAdv')?.value,
        priceFrom: this.filterForm.get('priceFrom')?.value,
        priceTo: this.filterForm.get('priceTo')?.value,
        mileageFrom: this.filterForm.get('mileageFrom')?.value,
        mileageTo: this.filterForm.get('mileageTo')?.value,
        yearFrom: this.filterForm.get('yearFrom')?.value,
        yearTo: this.filterForm.get('yearTo')?.value,
        lagerFrom: this.filterForm.get('lagerFrom')?.value,
        lagerTo: this.filterForm.get('lagerTo')?.value,
        gearbox: this.filterForm.get('gearbox')?.value,
        drivmedel: this.filterForm.get('drivmedel')?.value
      };
    }
    
    Object.keys(filters).forEach(key => {
      if (filters[key] === '' || filters[key] === null || filters[key] === undefined) {
        delete filters[key];
      }
    });

    console.log('Final Filters:', filters);

    this.vehicleService.getAllVehicles(this.currentPage, this.itemsPerPage, filters).pipe(
      switchMap((res: any) => loadingTimer$.pipe(map(() => res))),
      takeUntil(this.destroy$),
      finalize(() => {
        this.loading = false;
      }),
      catchError(err => {
        this.loadingError = 'Failed to load vehicles. Please try again.';
        return of(null);
      })
    ).subscribe(res => {
      if (res && res.success) {
        // Sort notes and media for each vehicle
        this.vehicles = (res.data || []).map((vehicle: any) => ({
          ...vehicle,
          notes: this.sortNotes(vehicle.notes),
          media: this.sortMedia(vehicle.media)
        }));
        
        this.filteredVehicles = [...this.vehicles];
        console.log(" this.filteredVehicles",  this.filteredVehicles)
        this.totalItems = res.totalItems || 0;
        if (this.vehicles.length === 0) {
          this.toastr.info('No vehicles found');
        }
        // Save stats from response
        if (res.stats) {
          this.stats = res.stats;
        }
      } else if (res && !res.success) {
        this.loadingError = res.message || 'Failed to load vehicles.';
        this.vehicles = [];
        this.filteredVehicles = [];
        this.totalItems = 0;
      }
    });
  }

  // Add Vehicle modal submit
  onSubmit(): void {
    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      this.toastr.error('Please fill in all required fields');
      return;
    }

    this.addingVehicle = true;
    const vehicleId = this.vehicleForm.value.vehicleId;
    const loadingTimer$ = timer(this.MINIMUM_LOADING_TIME);

    this.vehicleService.createVehicle(vehicleId).pipe(
      switchMap(res => loadingTimer$.pipe(map(() => res))),
      finalize(() => {
        this.addingVehicle = false;
      })
    ).subscribe({
      next: (res) => {
        this.toastr.success('Vehicle added successfully');
        this.isVisible = false;
        this.vehicleForm.reset();
        this.loadVehicles();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Failed to add vehicle');
      }
    });
  }

  showComingSoon(): void {
    this.toastr.info('Coming soon');
  }

  openDeleteModal(): void {
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  deleteVehicle(): void {
    if (!this.expandedVehicle.vehicleId) {
      console.log("this.expandedVehicle.vehicleId not found: this.expandedVehicle", this.expandedVehicle)
      this.toastr.error("vehicle id not found");
    }
    
    this.loading = true;
    const loadingTimer$ = timer(this.MINIMUM_LOADING_TIME);

    this.vehicleService.deleteVehicle(this.expandedVehicle.vehicleId).pipe(
      switchMap(res => loadingTimer$.pipe(map(() => res))),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: () => {
        this.toastr.success('Vehicle deleted successfully');
        this.showDeleteModal = false;
        this.expandedRowKey = null;
        this.expandedVehicle = null;
        this.loadVehicles();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Failed to delete vehicle');
        this.showDeleteModal = false;
      }
    });
  }

  // Pagination methods
  get paginatedVehicles(): any[] {
    // This getter might become simpler or be replaced if filteredVehicles directly holds the page data
    // For now, if filteredVehicles is the full list, it works. If it's page data, it's redundant.
    // Let's assume loadVehicles now correctly sets filteredVehicles to the current page's data.
    return this.filteredVehicles; 
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      // Determine if a search is active to maintain filters on page change
      const simpleSearchTerm = this.filterForm.get('searchTerm')?.value;
      const advFiltersSet = this.filterForm.get('vehicleTypeAdv')?.value || 
                             this.filterForm.get('statusAdv')?.value || 
                             this.filterForm.get('modelAdv')?.value || 
                             this.filterForm.get('yearAdv')?.value;

      if (advFiltersSet) { // Prioritize advanced if its panel was likely used
        this.loadVehicles('advanced');
      } else if (simpleSearchTerm) {
        this.loadVehicles('simple');
      } else {
        this.loadVehicles();
      }
    }
  }

  public getDisplayedPageNumbers(): number[] {
    const cp = this.currentPage;
    const tp = this.totalPages;

    if (tp === 0) return [];
    if (tp === 1) return [1];

    const pages: number[] = [];

    if (cp === 1) { // Current is 1
      pages.push(1);
      if (tp >= 2) pages.push(2);
      if (tp >= 3) pages.push(3);
    } else if (cp === tp) { // Current is last page
      if (tp >= 3) pages.push(tp - 2);
      if (tp >= 2) pages.push(tp - 1);
      pages.push(tp);
    } else { // Current is in the middle
      pages.push(cp - 1);
      pages.push(cp);
      pages.push(cp + 1);
    }
    // Filter out invalid pages (e.g. if tp=2, cp=1 -> [1,2]) and ensure uniqueness and order
    return Array.from(new Set(pages.filter(p => p > 0 && p <= tp))).sort((a,b) => a-b);
  }

  // Accordion logic
  toggleAccordion(rowKey: string, vehicle: Vehicle | null): void {
    if (!vehicle) return;
    
    if (this.expandedRowKey === rowKey) {
      this.expandedRowKey = null;
      this.expandedVehicle = null;
    } else {
    this.expandedRowKey = rowKey;
    this.expandedVehicle = vehicle;
  }
  }

  getStatusDisplay(statusCode: string | undefined): string {
    if (!statusCode) return 'N/A';
    
    switch (statusCode) {
      case 'STOCK':
        return 'In Stock';
      case 'SOLD':
        return 'Sold';
      case 'CONSIGNMENT':
        return 'Consignment';
      default:
        return statusCode || 'N/A';
    }
  }

  getStatusColor(statusCode: string | undefined): string {
    if (!statusCode) return 'bg-gray-100 text-gray-700';
    
    switch (statusCode) {
      case 'STOCK':
        return 'bg-blue-100 text-blue-700';
      case 'SOLD':
        return 'bg-green-100 text-green-700';
      case 'CONSIGNMENT':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  // Search and Filter Methods
  onSimpleSearch(): void {
    // This method is now effectively replaced by the searchTerm valueChanges subscription.
    // It can be kept if there are other programmatic reasons to trigger a simple search,
    // or removed if not.
    // For clarity, if it's only for the input, the valueChanges handles it.
    // If called from elsewhere, ensure it behaves as expected (e.g. using current searchTerm value).
    this.currentPage = 1;
    this.loadVehicles('simple');
  }

  applyAdvancedSearch(): void {
    this.currentPage = 1;
    this.loadVehicles('advanced');
    this.showAdvancedSearchPanel = false; // Close panel after applying
  }

  resetAdvancedFilters(): void {
    this.filterForm.patchValue({
      vehicleTypeAdv: '',
      statusAdv: '',
      modelAdv: '',
      yearAdv: ''
    });
    this.currentPage = 1;
    // Decide if resetting advanced filters should also clear simple search
    // For now, let's assume it does, or loads all if simple search is also empty
    if (this.filterForm.get('searchTerm')?.value) {
       this.loadVehicles('simple'); // Or loadVehicles() to clear all
    } else {
       this.loadVehicles();
    }
    this.showAdvancedSearchPanel = false;
  }

  getRowKey(vehicle: Vehicle | null, index: number): string {
    if (!vehicle) return `vehicle-${index}`;
    return vehicle._id || `vehicle-${index}`;
  }

  openFilterPanel() {
    this.showFilterPanel = true;
  }
  closeFilterPanel() {
    this.showFilterPanel = false;
  }
  applyFilterPanel() {
    this.currentPage = 1;
    this.loadVehicles('advanced');
    this.showFilterPanel = false;
  }
  resetFilterPanel() {
    this.filterForm.patchValue({
      vehicleTypeAdv: '',
      statusAdv: '',
      modelAdv: '',
      yearAdv: '',
      from: '',
      to: '',
      minAmount: '',
      maxAmount: ''
    });
    this.currentPage = 1;
    this.loadVehicles();
    this.showFilterPanel = false;
  }

  // Method to calculate days in stock
  calculateDaysInStock(createdAt: string | undefined): number {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Document handling methods
  viewDocument(doc: any): void {
    if (!doc || !doc.url) {
      this.toastr.warning('Document URL not available');
      return;
    }
    window.open(doc.url, '_blank');
  }

  downloadDocument(doc: any): void {
    if (!doc || !doc.url) {
      this.toastr.warning('Document URL not available');
      return;
    }
      const link = document.createElement('a');
      link.href = doc.url;
    link.download = doc.name || 'document';
      link.click();
  }

  // Trigger media upload input
  triggerDocumentUpload(): void {
    if (this.documentUploadInput && this.documentUploadInput.nativeElement) {
      this.documentUploadInput.nativeElement.click();
    }
  }

  // Method to sort notes in descending order
  private sortNotes(notes: any[] | undefined): any[] {
    if (!notes || !Array.isArray(notes)) return [];
    return notes.sort((a, b) => {
      const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  // Method to sort media in descending order
  private sortMedia(media: any[] | undefined): any[] {
    if (!media || !Array.isArray(media)) return [];
    return media.sort((a, b) => {
      const dateA = a.datetime ? new Date(a.datetime).getTime() : 0;
      const dateB = b.datetime ? new Date(b.datetime).getTime() : 0;
      return dateB - dateA;
    });
  }

  // Modify document upload method
  onDocumentUpload(event: any): void {
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
    const formData = new FormData();
    formData.append('document', file, file.name);

    this.vehicleService.uploadVehicleDocument(this.expandedVehicle._id, formData)
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
            
            // Directly update the media list for the expanded vehicle
            if (this.expandedVehicle) {
              // Ensure media array exists and is sorted
              this.expandedVehicle.media = this.sortMedia(response.media || []);
            }
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

  // Open note modal
  openNoteModal(): void {
    this.showNoteModal = true;
    // Reset note fields
    this.noteContent = '';
    this.noteTitle = '';
    this.noteIsPrivate = false;
  }

  // Modify note submission method
  submitNote(): void {
    // Validate note content
    if (!this.noteContent.trim()) {
      this.toastr.error('Note content cannot be empty');
      return;
    }

    this.addingNote = true;

    // Prepare note data
    const noteData = {
      content: this.noteContent,
      title: this.noteTitle || undefined,
      isPrivate: this.noteIsPrivate
    };

    // Ensure we have an expanded vehicle
    if (!this.expandedVehicle || !this.expandedVehicle._id) {
      this.toastr.error('No vehicle selected');
      this.addingNote = false;
      return;
    }

    if (this.editingNoteId) {
      // Edit existing note
      this.vehicleService.updateVehicleNote(this.expandedVehicle._id, this.editingNoteId, noteData)
        .pipe(finalize(() => { this.addingNote = false; }))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.toastr.success('Note updated successfully');
              // Update the note in the notes array
              if (this.expandedVehicle && Array.isArray(this.expandedVehicle.notes)) {
                const idx = this.expandedVehicle.notes.findIndex((n: any) => n._id === this.editingNoteId);
                if (idx !== -1) {
                  this.expandedVehicle.notes[idx] = { ...this.expandedVehicle.notes[idx], ...noteData };
                }
              }
              this.showNoteModal = false;
              this.noteContent = '';
              this.noteTitle = '';
              this.noteIsPrivate = false;
              this.editingNoteId = null;
            } else {
              this.toastr.error(response.message || 'Failed to update note');
            }
          },
          error: (error) => {
            this.toastr.error('Failed to update note');
          }
        });
    } else {
      // Add new note
      this.vehicleService.uploadVehicleNote(this.expandedVehicle._id, noteData)
        .pipe(finalize(() => { this.addingNote = false; }))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.toastr.success('Note uploaded successfully');
              // Directly update the notes list for the expanded vehicle
              if (this.expandedVehicle) {
                // Ensure notes array exists and is sorted
                this.expandedVehicle.notes = this.sortNotes(response.notes || []);
              }
              // Close modal and reset fields
              this.showNoteModal = false;
              this.noteContent = '';
              this.noteTitle = '';
              this.noteIsPrivate = false;
              this.editingNoteId = null;
            } else {
              this.toastr.error(response.message || 'Failed to upload note');
            }
          },
          error: (error) => {
            console.error('Note upload error:', error);
            this.toastr.error('Failed to upload note');
          }
        });
    }
  }

  // Method to open the outlay modal
  openOutlayModal(outlay?: any): void {
    if (outlay) {
      this.outlayData = { ...outlay }; // Populate with existing outlay data
      this.outlayId = outlay._id; // Set the ID for editing
    } else {
      this.outlayData = {
        name: '',
        sellerName: '',
        organizationNumber: '',
        address: '',
        location: '',
        postNumber: '',
        telephoneNumber: '',
        registrationNumber: '',
        amount: null,
        date: null,
        description: '',
        price: null,
        vat: null,
      };
      this.outlayId = null; // Reset for new outlay
    }
    this.showOutlayModal = true;
  }

  // Method to submit the outlay
  submitOutlay(): void {
    this.addingOutlay = true;
    if (this.outlayId) {
      // Update existing outlay
      this.vehicleService.updateOutlay(this.expandedVehicle._id, this.outlayId, this.outlayData).pipe(
        finalize(() => { this.addingOutlay = false; })
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success('Outlay updated successfully');
            if (this.expandedVehicle && Array.isArray(this.expandedVehicle.outlay)) {
              const idx = this.expandedVehicle.outlay.findIndex((o: any) => o._id === this.outlayId);
              if (idx !== -1) {
                this.expandedVehicle.outlay[idx] = response.outlay || { ...this.outlayData, _id: this.outlayId };
              }
            }
            this.showOutlayModal = false;
          } else {
            this.toastr.error(response.message || 'Failed to update outlay');
          }
        },
        error: (error) => {
          this.toastr.error('Failed to update outlay');
        }
      });
    } else {
      // Create new outlay
      this.vehicleService.addOutlay(this.expandedVehicle._id, this.outlayData).pipe(
        finalize(() => { this.addingOutlay = false; })
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success('Outlay added successfully');
            if (this.expandedVehicle) {
              if (!Array.isArray(this.expandedVehicle.outlay)) {
                this.expandedVehicle.outlay = [];
              }
              this.expandedVehicle.outlay.unshift(response.outlay || { ...this.outlayData, _id: response._id });
            }
            this.showOutlayModal = false;
          } else {
            this.toastr.error(response.message || 'Failed to add outlay');
          }
        },
        error: (error) => {
          this.toastr.error('Failed to add outlay');
        }
      });
    }
  }
  deleteOutlay(outlayId: string): void {
    this.vehicleService.deleteOutlay(this.expandedVehicle._id, outlayId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.toastr.success('Outlay deleted successfully');
          this.loadVehicles(); // Reload vehicles to get updated outlays
        } else {
          this.toastr.error(response.message || 'Failed to delete outlay');
        }
      },
      error: (error: any) => {
        this.toastr.error('Failed to delete outlay');
      }
    });
  }

  editNote(note: any): void {
    this.noteTitle = note.title || '';
    this.noteContent = note.content || '';
    this.noteIsPrivate = note.isPrivate || false;
    this.editingNoteId = note._id;
    this.showNoteModal = true;
  }

  deleteNote(noteId: string): void {
    if (!this.expandedVehicle || !this.expandedVehicle._id) {
      this.toastr.error('No vehicle selected');
      return;
    }
    this.deletingNoteId = noteId;
    this.vehicleService.deleteVehicleNote(this.expandedVehicle._id, noteId).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Note deleted successfully');
          if (this.expandedVehicle && Array.isArray(this.expandedVehicle.notes)) {
            this.expandedVehicle.notes = this.expandedVehicle.notes.filter((n: any) => n._id !== noteId);
          }
        } else {
          this.toastr.error(response.message || 'Failed to delete note');
        }
        this.deletingNoteId = null;
      },
      error: (error) => {
        this.toastr.error('Failed to delete note');
        this.deletingNoteId = null;
      }
    });
  }
}

