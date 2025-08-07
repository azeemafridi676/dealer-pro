import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { ToastrService } from 'ngx-toastr';
import { Subject, timer } from 'rxjs';
import { takeUntil, finalize, debounceTime, distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';
import { 
  SwishService, 
  SwishPayment as ServiceSwishPayment,
  SwishPaymentRequest 
} from 'src/app/shared/service/swish/swish.service';
import { LoggingService } from 'src/app/shared/service/logging.service';
import { SelectOption } from '../../shared/components/custom-select/custom-select.component';

// Swish Payment Status Enum
export enum SwishPaymentStatus {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  FAILED = 'FAILED'
}

// Swish Payment Status Display Names
export const SwishPaymentStatusDisplay: Record<SwishPaymentStatus, string> = {
  [SwishPaymentStatus.COMPLETED]: 'Completed',
  [SwishPaymentStatus.PENDING]: 'Pending',
  [SwishPaymentStatus.FAILED]: 'Failed'
};

// Swish Payment Status Colors
export const SwishPaymentStatusColors: Record<SwishPaymentStatus, string> = {
  [SwishPaymentStatus.COMPLETED]: 'bg-green-100 text-green-700',
  [SwishPaymentStatus.PENDING]: 'bg-yellow-100 text-yellow-700',
  [SwishPaymentStatus.FAILED]: 'bg-red-100 text-red-700'
};

// Local type definition to avoid import conflicts
export interface SwishPayment extends ServiceSwishPayment {}

// Column Settings Interface
interface ColumnSettings {
  selectedColumns: string[];
  availableColumns: string[];
}

@Component({
  selector: 'app-swish',
  templateUrl: './swish.component.html',
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
export class SwishComponent implements OnInit, OnDestroy {
  payments: SwishPayment[] = [];
  filteredPayments: SwishPayment[] = [];
  loading: boolean = false;
  detailLoading: boolean = false;
  isVisible: boolean = false;
  isEditMode: boolean = false;
  showAdvancedSearch: boolean = false;
  showAdvancedSearchPanel: boolean = false;
  showDeleteModal: boolean = false;
  paymentForm: FormGroup;
  filterForm: FormGroup;

  // Column settings
  private readonly COLUMN_SETTINGS_KEY = 'swish_payments_columns';
  selectedColumns: string[] = [];
  availableColumns: string[] = [];

  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 15;
  totalItems: number = 0;
  totalPages: number = 0;
  Math = Math;

  // Modal tab state
  activeTab: string = 'payment';

  // Accordion state
  expandedRowKey: string | null = null;
  expandedPayment: SwishPayment | null = null;

  // Make enums available to template
  SwishPaymentStatus = SwishPaymentStatus;
  SwishPaymentStatusDisplay = SwishPaymentStatusDisplay;
  SwishPaymentStatusColors = SwishPaymentStatusColors;

  private destroy$ = new Subject<void>();
  loadingError: string | null = null;
  detailLoadingError: string | null = null;
  addingPayment = false;
  showColumnSettings = false;

  // Add stats property
  stats: {
    totalPayments: number;
    averagePaymentAmount: number;
    statusCounts: Record<SwishPaymentStatus, number>;
  } = {
    totalPayments: 0,
    averagePaymentAmount: 0,
    statusCounts: {
      COMPLETED: 0,
      PENDING: 0,
      FAILED: 0
    }
  };

  showFilterPanel = false;

  // Add MINIMUM_LOADING_TIME constant
  private readonly MINIMUM_LOADING_TIME = 250;

  // Existing properties...
  private searchSubject = new Subject<string>();

  // Add these properties to the class
  statusOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'FAILED', label: 'Failed' }
  ];

  categoryOptions: SelectOption[] = [
    { value: '', label: 'All Categories' },
    { value: 'Private', label: 'Private' },
    { value: 'Company', label: 'Company' },
    { value: 'Business', label: 'Business' },
    { value: 'Agency', label: 'Agency' },
    { value: 'Client', label: 'Client' }
  ];

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private router: Router,
    private swishService: SwishService,
    private loggingService: LoggingService
  ) {
    this.paymentForm = this.fb.group({
      reference: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0)]],
      customer: ['', Validators.required]
    });

    this.filterForm = this.fb.group({
      searchTerm: [''],
      categoryAdv: [''],
      statusAdv: [''],
      fromDateAdv: [''],
      toDateAdv: [''],
      minAmountAdv: [''],
      maxAmountAdv: ['']
    });

    this.loadColumnSettings();
  }

  ngOnInit(): void {
    this.loadPayments();
    
    // Debounced search with minimum loading time
    this.searchSubject.pipe(
      debounceTime(300), // Wait 300ms after last keystroke
      distinctUntilChanged(), // Ignore if value hasn't changed
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadPayments('advanced');
    });

    // Subscribe to search term changes for manual input
    this.filterForm.get('searchTerm')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.searchSubject.next(searchTerm);
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
        'Reference', 'Name', 'Amount', 'Date', 'Category', 'Status'
      ];
      this.availableColumns = [
        'Payment ID', 'Related Invoice', 'Total Amount', 
        'Processing Time', 'Contact Person', 'Contact Email'
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

  // Add a method to initialize stats
  private initializeStats() {
    this.stats = {
      totalPayments: 0,
      averagePaymentAmount: 0,
      statusCounts: {
        COMPLETED: 0,
        PENDING: 0,
        FAILED: 0
      }
    };
  }

  loadPayments(searchType?: 'advanced'): void {
    this.loading = true;
    const loadingTimer$ = timer(this.MINIMUM_LOADING_TIME);

    // Initialize stats before loading
    this.initializeStats();

    this.loadingError = null;

    // Prepare search parameters
    const params: any = {
      page: this.currentPage,
      limit: this.itemsPerPage
    };

    // Add search parameters based on search type
    if (searchType === 'advanced') {
      const category = this.filterForm.get('categoryAdv')?.value || undefined;
      const status = this.filterForm.get('statusAdv')?.value || undefined;
      const fromDate = this.filterForm.get('fromDateAdv')?.value || undefined;
      const toDate = this.filterForm.get('toDateAdv')?.value || undefined;
      const minAmount = this.filterForm.get('minAmountAdv')?.value || undefined;
      const maxAmount = this.filterForm.get('maxAmountAdv')?.value || undefined;
      const searchTerm = this.filterForm.get('searchTerm')?.value || undefined;

      // Only add non-empty parameters
      if (category) params.category = category;
      if (status) params.status = status;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (minAmount !== undefined && minAmount !== '') params.minAmount = minAmount;
      if (maxAmount !== undefined && maxAmount !== '') params.maxAmount = maxAmount;
      if (searchTerm) params.searchTerm = searchTerm;
    }


    // Call Swish service to fetch payments
    this.swishService.getSwishPayments(params).pipe(
      takeUntil(this.destroy$),
      // Wait for at least MINIMUM_LOADING_TIME
      switchMap((response) => loadingTimer$.pipe(map(() => response))),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (response) => {
        this.payments = response.data;
        this.filteredPayments = [...this.payments];
        this.totalItems = response.totalItems;
        this.totalPages = response.totalPages;
        this.currentPage = response.currentPage;

        // Update stats from backend response
        if (response.stats) {
          this.stats = {
            totalPayments: response.stats.totalPayments,
            averagePaymentAmount: response.stats.averagePaymentAmount,
            statusCounts: response.stats.statusCounts
          };
        }

       
      },
      error: (error) => {
        this.loadingError = error.error?.message || 'Failed to load payments';
        this.toastr.error(this.loadingError || 'Failed to load payments');
      }
    });
  }

  calculateAveragePayment(): number {
    if (this.payments.length === 0) return 0;
    const total = this.payments.reduce((sum, payment) => sum + payment.totalAmount, 0);
    return total / this.payments.length;
  }

  // Add Payment modal submit
  onSubmit(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      this.toastr.error('Please fill in all required fields');
      return;
    }

    // Get form values
    const formValues = this.paymentForm.value;

    // Prepare payment data with contact info
    const paymentData: SwishPaymentRequest = {
      reference: formValues.reference,
      name: formValues.customer, // Use customer field as name
      category: '', // You might want to add a category field to the form
      amounts: [{ 
        amount: formValues.amount, 
        description: '' // Optional description
      }],
      socialSecurityNumber: '', // Add if needed
      telephoneNumber: '', // Add if needed
      email: '', // Add if needed
      contactInfo: {
        contactPerson: formValues.customer, // Set contact person from customer field
        contactEmail: '' // Add if needed
      }
    };

    this.addingPayment = true;

    // Simulated API call
    setTimeout(() => {
      this.toastr.success('Payment added successfully');
      this.isVisible = false;
      this.paymentForm.reset();
      this.addingPayment = false;
      this.loadPayments();
    }, 250);
  }

  // Pagination methods
  get paginatedPayments(): SwishPayment[] {
    return this.filteredPayments; 
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      const simpleSearchTerm = this.filterForm.get('searchTerm')?.value || '';
      const advFiltersSet = 
        this.filterForm.get('categoryAdv')?.value || 
        this.filterForm.get('statusAdv')?.value || 
        this.filterForm.get('fromDateAdv')?.value || 
        this.filterForm.get('toDateAdv')?.value;

      if (advFiltersSet) {
        this.loadPayments('advanced');
      } else if (simpleSearchTerm) {
        this.loadPayments('advanced');
      } else {
        this.loadPayments();
      }
    }
  }

  public getDisplayedPageNumbers(): number[] {
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
    return Array.from(new Set(pages.filter(p => p > 0 && p <= tp))).sort((a,b) => a-b);
  }

  // Accordion logic
  toggleAccordion(rowKey: string, payment: SwishPayment): void {
    if (this.expandedRowKey === rowKey) {
      this.expandedRowKey = null;
      this.expandedPayment = null;
      return;
    }

    this.expandedRowKey = rowKey;
    this.expandedPayment = payment;
  }

  getStatusDisplay(statusCode: SwishPaymentStatus): string {
    return SwishPaymentStatusDisplay[statusCode] || 'Unknown';
  }

  getStatusColor(statusCode: SwishPaymentStatus): string {
    return SwishPaymentStatusColors[statusCode] || 'bg-gray-100 text-gray-700';
  }

  getRowKey(payment: SwishPayment, index: number): string {
    return payment._id ? payment._id : `${payment.reference}_${index}`;
  }

  // Filter Panel Methods
  openFilterPanel() {
    this.showFilterPanel = true;
  }

  closeFilterPanel() {
    this.showFilterPanel = false;
  }

  applyFilterPanel() {
    this.currentPage = 1;
    this.loadPayments('advanced');
    this.showFilterPanel = false;
  }

  resetFilterPanel() {
    this.filterForm.patchValue({
      categoryAdv: '',
      statusAdv: '',
      fromDateAdv: '',
      toDateAdv: '',
      minAmountAdv: '',
      maxAmountAdv: ''
    });
    this.currentPage = 1;
    this.loadPayments();
    this.showFilterPanel = false;
  }

  // Delete Payment
  deletePayment(): void {
    if (!this.expandedPayment || !this.expandedPayment.swish_id) return;
    
    this.loading = true;

    this.swishService.deleteSwishPayment(this.expandedPayment.swish_id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success(response.message || 'Payment deleted successfully');
            this.showDeleteModal = false;
            this.expandedRowKey = null;
            this.expandedPayment = null;
            this.loadPayments();
          } else {
            this.toastr.warning(response.message || 'Failed to delete payment');
          }
        },
        error: (error) => {
          this.toastr.error(error.error?.message || 'Error deleting payment');
        }
      });
  }

  // Modify the getColumnValue method to include more robust name retrieval
  getColumnValue(payment: SwishPayment, columnName: string): string {
    // Special handling for specific columns
    switch(columnName) {
      case 'Name':
        return payment.contactInfo?.contactPerson || payment.name || 'N/A';
      
      case 'Related Invoice':
        return payment.receipt_id?.receiptNumber || 'N/A';
      
      case 'Payment ID':
        return payment.swish_id || 'N/A';
      
      case 'Total Amount':
        return payment.totalAmount ? `${payment.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr` : 'N/A';
      
      case 'Processing Time':
        // Use the same date as the main date field
        return payment.date ? new Date(payment.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : 'N/A';
      
      case 'Contact Person':
        return payment.contactInfo?.contactPerson || payment.name || 'N/A';
      
      case 'Contact Email':
        return payment.contactInfo?.contactEmail || payment.email || 'N/A';
      
      case 'Category':
        return payment.category || 'N/A';
      
      // Default handling for other columns
      default:
        // Try to find the value dynamically
        const columnLowerCase = columnName.toLowerCase();
        const paymentKeys = Object.keys(payment);
        
        for (const key of paymentKeys) {
          if (key.toLowerCase() === columnLowerCase) {
            const value = payment[key as keyof SwishPayment];
            return value ? String(value) : 'N/A';
          }
        }
        
        // If no matching key found, check nested objects
        const nestedObjects = ['paymentDetails', 'processingInfo', 'contactInfo', 'receipt_id'];
        for (const objKey of nestedObjects) {
          const nestedObj = payment[objKey as keyof SwishPayment];
          if (nestedObj && typeof nestedObj === 'object') {
            for (const [key, value] of Object.entries(nestedObj)) {
              if (key.toLowerCase() === columnLowerCase) {
                return value ? String(value) : 'N/A';
              }
            }
          }
        }
        
        return 'N/A';
    }
  }

  navigateToAddPayment() {
    this.router.navigate(['/dashboard/swish/add']);
  }

  // Update methods to use backend stats
  getTotalPayments(): number {
    return this.stats.totalPayments;
  }

  getPaymentStatusCount(status: SwishPaymentStatus | null | undefined): number {
    if (!status) return 0;
    return this.stats.statusCounts[status] || 0;
  }
}