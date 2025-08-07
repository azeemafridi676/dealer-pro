import { Component, OnInit, OnDestroy, Inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subject, timer } from 'rxjs';
import { takeUntil, finalize, debounceTime, distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import { LoggingService } from 'src/app/shared/service/logging.service';
import { InvoiceService } from '../../shared/service/invoice/invoice.service';
import { InvoiceData, InvoiceResponse, InvoiceSearchParams } from '../../shared/service/invoice/invoice.service';
import { SelectOption } from '../../shared/components/custom-select/custom-select.component';
import { CustomSelectComponent } from '../../shared/components/custom-select/custom-select.component';

// Invoice Status Enum
export enum InvoiceStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
  OVERDUE = 'OVERDUE'
}

// Invoice Status Display Names
export const InvoiceStatusDisplay: Record<InvoiceStatus, string> = {
  [InvoiceStatus.PAID]: 'Paid',
  [InvoiceStatus.PENDING]: 'Pending',
  [InvoiceStatus.OVERDUE]: 'Overdue'
};

// Invoice Status Colors
export const InvoiceStatusColors: Record<InvoiceStatus, string> = {
  [InvoiceStatus.PAID]: 'bg-green-100 text-green-700',
  [InvoiceStatus.PENDING]: 'bg-yellow-100 text-yellow-700',
  [InvoiceStatus.OVERDUE]: 'bg-red-100 text-red-700'
};

// Local type definition for Invoice
export interface Invoice {
  _id?: string;
  receipt_id?: string;
  receiptNumber: string;
  customerName: string;
  totalAmount: number;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  paymentMethod?: string;
  paymentDate?: Date;
  notes?: string;
  invoiceItems: InvoiceItem[];
  contactInfo?: {
    contactPerson?: string;
    contactEmail?: string;
  };
  customerType?: 'Private' | 'Company' | 'Agency' | 'Client';
  organizationNumber?: string;
  businessDescription?: string;
  businessCategory?: string;
  legalForm?: string;
  vatNumber?: string;
  language?: 'English' | 'Swedish' | 'Other';
  currency?: 'SEK' | 'USD' | 'EUR';
  customer?: {
    name?: string;
    email?: string;
    telephone?: string;
  };
}

// New interface for invoice items
export interface InvoiceItem {
  product: string;
  number: number;
  unit: string;
  priceExclVAT: number;
  vatRate: number;
  amount?: number;
}

// Column Settings Interface
interface ColumnSettings {
  selectedColumns: string[];
  availableColumns: string[];
}

@Component({
  selector: 'app-invoice',
  templateUrl: './invoice.component.html',
  styleUrls: ['./invoice.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    DragDropModule
  ],
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
export class InvoiceComponent implements OnInit, OnDestroy {
  invoices: Invoice[] = [];
  filteredInvoices: Invoice[] = [];
  loading: boolean = false;
  detailLoading: boolean = false;
  isVisible: boolean = false;
  isEditMode: boolean = false;
  showAdvancedSearch: boolean = false;
  showAdvancedSearchPanel: boolean = false;
  showDeleteModal: boolean = false;
  invoiceForm: FormGroup;
  filterForm: FormGroup;

  // Column settings
  private readonly COLUMN_SETTINGS_KEY = 'invoices_columns';
  selectedColumns: string[] = [];
  availableColumns: string[] = [];
  showColumnSettings = false;

  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 15;
  totalItems: number = 0;
  totalPages: number = 0;
  Math = Math;

  // Modal tab state
  activeTab: string = 'invoice';

  // Accordion state
  expandedRowKey: string | null = null;
  expandedInvoice: Invoice | null = null;

  // Make enums available to template
  InvoiceStatus = InvoiceStatus;
  InvoiceStatusDisplay = InvoiceStatusDisplay;
  InvoiceStatusColors = InvoiceStatusColors;

  private destroy$ = new Subject<void>();
  loadingError: string | null = null;
  detailLoadingError: string | null = null;
  addingInvoice = false;

  // Add stats property
  stats: {
    totalInvoices: number;
    totalInvoiceAmount: number;
    averageInvoiceAmount: number;
    statusCounts: Record<InvoiceStatus, number>;
    customerTypeDistribution?: Record<string, {
      count: number;
      totalAmount: number;
    }>;
  } = {
    totalInvoices: 0,
    totalInvoiceAmount: 0,
    averageInvoiceAmount: 0,
    statusCounts: {
      PAID: 0,
      PENDING: 0,
      OVERDUE: 0
    }
  };

  showFilterPanel = false;

  // Add MINIMUM_LOADING_TIME constant
  private readonly MINIMUM_LOADING_TIME = 250;

  private searchSubject = new Subject<string>();

  statusOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'PAID', label: 'Paid' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'OVERDUE', label: 'Overdue' }
  ];

  customerTypeOptions: SelectOption[] = [
    { value: '', label: 'All Customer Types' },
    { value: 'Private', label: 'Private' },
    { value: 'Company', label: 'Company' },
    { value: 'Agency', label: 'Agency' },
    { value: 'Client', label: 'Client' }
  ];

  // Dropdown state properties
  isStatusDropdownOpen = false;
  isCustomerTypeDropdownOpen = false;

  // Add sorting options
  sortOptions: SelectOption[] = [
    { value: 'totalAmount:desc', label: 'Amount (Highest First)' },
    { value: 'totalAmount:asc', label: 'Amount (Lowest First)' },
    { value: 'issueDate:desc', label: 'Issue Date (Newest First)' },
    { value: 'issueDate:asc', label: 'Issue Date (Oldest First)' }
  ];

  // Sorting state
  currentSort: string = '';
  isSortDropdownOpen = false;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private router: Router,
    private loggingService: LoggingService,
    @Inject(InvoiceService) private invoiceService: InvoiceService
  ) {
    this.invoiceForm = this.fb.group({
      invoiceNumber: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0)]],
      customer: ['', Validators.required]
    });

    this.filterForm = this.fb.group({
      searchTerm: [''],
      categoryAdv: [''],
      statusAdv: [''],
      customerTypeAdv: [''],
      fromDateAdv: [''],
      toDateAdv: [''],
      minAmountAdv: [''],
      maxAmountAdv: [''],
      sortAdv: ['']
    });

    this.loadColumnSettings();
  }

  ngOnInit(): void {
    // Ensure columns are not empty
    if (this.selectedColumns.length === 0) {
      // Fallback to default columns if no columns are selected
      this.selectedColumns = [
        'INVOICE #', 
        'CUSTOMER', 
        'AMOUNT', 
        'ISSUE DATE', 
        'DUE DATE', 
        'STATUS'
      ];
      
      // Save the fallback columns to localStorage
      this.saveColumnSettings();
    }

    this.loadInvoices();
    
    // Debounced search with minimum loading time
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadInvoices('advanced');
    });

    // Subscribe to search term changes for manual input
    this.filterForm.get('searchTerm')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.searchSubject.next(searchTerm);
    });

    // Add sorting control to filter form
    this.filterForm.addControl('sortAdv', this.fb.control(''));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Modify loadColumnSettings to ensure columns are always set
  private loadColumnSettings() {
    // Default columns if nothing is found
    const defaultSelectedColumns = [
      'INVOICE #', 
      'CUSTOMER', 
      'AMOUNT', 
      'ISSUE DATE', 
      'DUE DATE', 
      'STATUS'
    ];

    const defaultAvailableColumns = [
      'Invoice ID', 
      'Related Receipt', 
      'Total Amount', 
      'Processing Time', 
      'Contact Person', 
      'Contact Email'
    ];

    const savedSettings = localStorage.getItem(this.COLUMN_SETTINGS_KEY);

    try {
      if (savedSettings) {
        const settings: ColumnSettings = JSON.parse(savedSettings);

        // Ensure both arrays exist and have content
        this.selectedColumns = settings.selectedColumns && settings.selectedColumns.length > 0 
          ? settings.selectedColumns 
          : defaultSelectedColumns;
        
        this.availableColumns = settings.availableColumns && settings.availableColumns.length > 0
          ? settings.availableColumns
          : defaultAvailableColumns;
      } else {
        // No saved settings, use defaults
        this.selectedColumns = defaultSelectedColumns;
        this.availableColumns = defaultAvailableColumns;
      }
    } catch (error) {
      // Fallback to default columns
      this.selectedColumns = defaultSelectedColumns;
      this.availableColumns = defaultAvailableColumns;
    }

    // Always save the settings to ensure consistency
    const settings: ColumnSettings = {
      selectedColumns: this.selectedColumns,
      availableColumns: this.availableColumns
    };
    localStorage.setItem(this.COLUMN_SETTINGS_KEY, JSON.stringify(settings));
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

  // Modify saveColumnSettings to log state
  public saveColumnSettings(): void {
    const settings: ColumnSettings = {
      selectedColumns: this.selectedColumns,
      availableColumns: this.availableColumns
    };
    
    // Save to localStorage
    localStorage.setItem(this.COLUMN_SETTINGS_KEY, JSON.stringify(settings));
    
    // Close the modal
    this.showColumnSettings = false;
    
    // Show success toast
    this.toastr.success('Column settings saved successfully');
    
  }

  // Update the stats calculation method
  private initializeStats() {
    this.stats = {
      totalInvoices: 0,
      totalInvoiceAmount: 0,
      averageInvoiceAmount: 0,
      statusCounts: {
        PAID: 0,
        PENDING: 0,
        OVERDUE: 0
      }
    };
  }

  loadInvoices(searchType?: 'advanced'): void {
    this.loading = true;
    this.initializeStats();

    this.loadingError = null;

    // Prepare search parameters
    const searchParams: InvoiceSearchParams = {
      page: this.currentPage,
      limit: this.itemsPerPage
    };

    // Add advanced search parameters if applicable
    if (searchType === 'advanced') {
      const filterValues = this.filterForm.value;
      
      // Search term
      if (filterValues.searchTerm) {
        searchParams.searchTerm = filterValues.searchTerm;
      }

      // Invoice Status
      if (filterValues.statusAdv) {
        searchParams.invoiceStatus = filterValues.statusAdv;
      }

      // Customer Type
      if (filterValues.customerTypeAdv) {
        searchParams.customerType = filterValues.customerTypeAdv;
      }

      // Date range
      if (filterValues.fromDateAdv) {
        searchParams.fromDate = this.formatDate(filterValues.fromDateAdv);
      }
      if (filterValues.toDateAdv) {
        searchParams.toDate = this.formatDate(filterValues.toDateAdv);
      }

      // Amount range
      if (filterValues.minAmountAdv) {
        searchParams.minAmount = parseFloat(filterValues.minAmountAdv);
      }
      if (filterValues.maxAmountAdv) {
        searchParams.maxAmount = parseFloat(filterValues.maxAmountAdv);
      }

      // Sorting
      if (filterValues.sortAdv) {
        const [sortBy, sortOrder] = filterValues.sortAdv.split(':');
        searchParams.sortBy = sortBy;
        searchParams.sortOrder = sortOrder;
      }
    }

    // Call service method to get invoices
    this.invoiceService.getInvoices(searchParams).subscribe({
      next: (response: InvoiceResponse) => {
        // Robust null checks and default values
        const invoiceData = response?.data || [];
        console.log(invoiceData)
        // Defensive mapping with fallback
        const mappedInvoices: Invoice[] = invoiceData.map((invoice: InvoiceData) => ({
          _id: invoice._id || '',
          receipt_id: invoice.receipt_id || '',
          receiptNumber: invoice.receiptNumber || '',
          customerName: 
            (invoice.customer && typeof invoice.customer === 'object' 
              ? invoice.customer.name || 'Unknown'
              : invoice.contactPerson || invoice.customer || 'Unknown'),
          totalAmount: invoice.totally || 0,
          status: this.determineInvoiceStatus(invoice),
          issueDate: invoice.receiptDate ? new Date(invoice.receiptDate) : new Date(),
          dueDate: invoice.dueDate ? new Date(invoice.dueDate) : new Date(),
          invoiceItems: (invoice.invoiceItems || []).map(item => ({
            product: item.product || '',
            number: item.number || 0,
            unit: item.unit || '',
            priceExclVAT: item.priceExclVAT || 0,
            vatRate: item.vatRate || 0,
            amount: item.amount || (item.priceExclVAT * item.number) || 0
          })),
          contactInfo: {
            contactPerson: 
              (invoice.customer && typeof invoice.customer === 'object' 
                ? invoice.customer.name || invoice.contactPerson || ''
                : invoice.contactPerson || ''),
            contactEmail: 
              (invoice.customer && typeof invoice.customer === 'object' 
                ? invoice.customer.email || invoice.email || ''
                : invoice.email || '')
          },
          customerType: this.normalizeCustomerType(invoice.customerType),
          organizationNumber: invoice.organizationNumber || '',
          businessDescription: invoice.businessDescription || '',
          businessCategory: invoice.businessCategory || '',
          legalForm: invoice.legalForm || '',
          vatNumber: invoice.vatNumber || '',
          language: invoice.language || 'Other',
          currency: invoice.currency || 'SEK',
          customer: 
            (invoice.customer && typeof invoice.customer === 'object' 
              ? invoice.customer 
              : { name: invoice.contactPerson, email: invoice.email })
        }));

        // Ensure we have an array even if mapping fails
        this.invoices = Array.isArray(mappedInvoices) ? mappedInvoices : [];
        this.filteredInvoices = [...this.invoices];
        
        // Defensive pagination
        this.totalItems = response?.totalItems || this.invoices.length || 0;
        this.totalPages = response?.totalPages || Math.ceil(this.totalItems / this.itemsPerPage) || 1;
        
        // Defensive stats initialization
        this.stats = {
          totalInvoices: response?.stats?.totalInvoices || 0,
          totalInvoiceAmount: response?.stats?.totalInvoiceAmount || 0,
          averageInvoiceAmount: response?.stats?.averageInvoiceAmount || 0,
          statusCounts: response?.stats?.statusCounts || {
            PAID: 0,
            PENDING: 0,
            OVERDUE: 0
          },
          customerTypeDistribution: response?.stats?.customerTypeDistribution || {}
        };

        this.loading = false;
      },
      error: (error: Error) => {
        this.loadingError = 'Failed to load invoices';
        this.loading = false;
      }
    });
  }

  // Remove the manual status determination method
  private determineInvoiceStatus(invoice: InvoiceData): InvoiceStatus {
    // Use the invoiceStatus directly from the backend
    switch(invoice.invoiceStatus) {
      case 'PAID':
        return InvoiceStatus.PAID;
      case 'PENDING':
        return InvoiceStatus.PENDING;
      case 'OVERDUE':
        return InvoiceStatus.OVERDUE;
      default:
        return InvoiceStatus.PENDING;
    }
  }

  // Pagination methods
  get paginatedInvoices(): Invoice[] {
    return this.filteredInvoices; 
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
        this.loadInvoices('advanced');
      } else if (simpleSearchTerm) {
        this.loadInvoices('advanced');
      } else {
        this.loadInvoices();
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
  toggleAccordion(rowKey: string, invoice: Invoice): void {
    // If clicking the same row, close it
    if (this.expandedRowKey === rowKey) {
      this.expandedRowKey = null;
      this.expandedInvoice = null;
      return;
    }

    // Open the new row
    this.expandedRowKey = rowKey;
    this.expandedInvoice = invoice;
  }

  getStatusDisplay(statusCode: InvoiceStatus): string {
    return InvoiceStatusDisplay[statusCode] || 'Unknown';
  }

  getStatusColor(statusCode: InvoiceStatus): string {
    return InvoiceStatusColors[statusCode] || 'bg-gray-100 text-gray-700';
  }

  // Update getRowKey method
  getRowKey(invoice: Invoice, index: number): string {
    return invoice._id || invoice.receiptNumber || `invoice_${index}`;
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
    this.loadInvoices('advanced');
    this.showFilterPanel = false;
  }

  resetFilterPanel() {
    this.filterForm.reset({
      searchTerm: '',
      statusAdv: '',
      fromDateAdv: '',
      toDateAdv: '',
      minAmountAdv: '',
      maxAmountAdv: '',
      sortAdv: ''
    });
    this.currentPage = 1;
    this.loadInvoices();
    this.showFilterPanel = false;
  }

  // Delete Invoice
  deleteInvoice(): void {
    if (!this.expandedInvoice || !this.expandedInvoice.receipt_id) {
      this.toastr.error('Invalid invoice selected for deletion');
      return;
    }
   
    this.loading = true;
    this.invoiceService.deleteInvoice(this.expandedInvoice.receipt_id as string).subscribe({
      next: (response) => {
        // Success handling
        this.toastr.success('Invoice deleted successfully');
        this.showDeleteModal = false;
        this.expandedRowKey = null;
        this.expandedInvoice = null;
        
        // Reload invoices
        this.loadInvoices();
      },
      error: (error) => {
        // Error handling
        this.toastr.error(error.message || 'Failed to delete invoice');
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  // Method to trigger delete modal
  confirmDeleteInvoice(invoice: Invoice): void {
    this.expandedInvoice = invoice;
    this.showDeleteModal = true;
  }

  // Modify the getColumnValue method to include more robust name retrieval
  getColumnValue(invoice: Invoice, columnName: string): string {

    // Special handling for specific columns
    switch(columnName) {
      case 'Invoice ID':
        return invoice._id || 'N/A';
      
      case 'Related Receipt':
        return invoice.receiptNumber || 'N/A';
      
      case 'Total Amount':
        return invoice.totalAmount ? `${invoice.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr` : 'N/A';
      
      case 'Processing Time':
        return invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : 'N/A';
      
      case 'Contact Person':
        return invoice.contactInfo?.contactPerson || invoice.customerName || 'N/A';
      
      case 'Contact Email':
        return invoice.contactInfo?.contactEmail || 'N/A';
      
      // Default handling for other columns
      default:
        return 'N/A';
    }
  }

  navigateToAddInvoice() {
    this.router.navigate(['/dashboard/invoices/add']);
  }

  // Add method to get object keys
  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  // Helper method to format date for backend
  private formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }

  // New method to get a descriptive summary of total invoiced amount
  getInvoicedAmountSummary(): string {
    const totalInvoiced = this.stats.totalInvoiceAmount;
    const totalInvoices = this.stats.totalInvoices;

    if (totalInvoices === 0) return 'No invoices generated';
    
    if (totalInvoiced < 1000) return `Small volume of invoices`;
    if (totalInvoiced < 10000) return `Moderate invoice volume`;
    if (totalInvoiced < 50000) return `Substantial invoice volume`;
    return `High invoice volume`;
  }

  // New method to get outstanding payments context
  getOutstandingPaymentsSummary(): string {
    const pendingInvoices = this.stats.statusCounts.PENDING;
    const overdueInvoices = this.stats.statusCounts.OVERDUE;
    const pendingAmount = this.stats.statusCounts.PENDING * this.stats.averageInvoiceAmount;

    if (pendingInvoices === 0 && overdueInvoices === 0) return 'All invoices are settled';
    
    if (overdueInvoices > 0) {
      return `${overdueInvoices} overdue invoice${overdueInvoices > 1 ? 's' : ''} require immediate attention`;
    }

    return `${pendingInvoices} invoice${pendingInvoices > 1 ? 's' : ''} awaiting payment`;
  }

  // New method to get paid invoices context
  getPaidInvoicesSummary(): string {
    const paidInvoices = this.stats.statusCounts.PAID;
    const paidAmount = this.stats.statusCounts.PAID * this.stats.averageInvoiceAmount;

    if (paidInvoices === 0) return 'No paid invoices yet';
    
    if (this.stats.customerTypeDistribution) {
      const customerTypes = Object.keys(this.stats.customerTypeDistribution);
      return `Paid across ${customerTypes.length} customer type${customerTypes.length > 1 ? 's' : ''}`;
    }

    return `${paidInvoices} invoice${paidInvoices > 1 ? 's' : ''} successfully paid`;
  }

  // Dropdown toggle methods
  toggleStatusDropdown(): void {
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
    this.isCustomerTypeDropdownOpen = false; // Close other dropdowns
  }

  toggleCustomerTypeDropdown(): void {
    this.isCustomerTypeDropdownOpen = !this.isCustomerTypeDropdownOpen;
    this.isStatusDropdownOpen = false; // Close other dropdowns
  }

  // Option selection methods
  selectStatusOption(option: SelectOption): void {
    this.filterForm.get('statusAdv')?.setValue(option.value);
    this.isStatusDropdownOpen = false;
  }

  selectCustomerTypeOption(option: SelectOption): void {
    this.filterForm.get('customerTypeAdv')?.setValue(option.value);
    this.isCustomerTypeDropdownOpen = false;
    
    // Trigger invoice loading with advanced search
    this.currentPage = 1;
    this.loadInvoices('advanced');
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  clickOutside(event: MouseEvent): void {
    const clickedInside = (event.target as HTMLElement).closest('.custom-select-wrapper');
    if (!clickedInside) {
      this.isStatusDropdownOpen = false;
      this.isCustomerTypeDropdownOpen = false;
      this.isSortDropdownOpen = false;
    }
  }

  // New method for sorting
  toggleSortDropdown(): void {
    this.isSortDropdownOpen = !this.isSortDropdownOpen;
    // Close other dropdowns
    this.isStatusDropdownOpen = false;
    this.isCustomerTypeDropdownOpen = false;
  }

  selectSortOption(option: SelectOption): void {
    this.filterForm.get('sortAdv')?.setValue(option.value);
    this.isSortDropdownOpen = false;
    
    // Trigger invoice loading with advanced search
    this.currentPage = 1;
    this.loadInvoices('advanced');
  }

  // Method to get sort label
  getSortLabel(): string {
    const sortValue = this.filterForm.get('sortAdv')?.value;
    if (!sortValue) return 'Select Sorting';

    const foundOption = this.sortOptions.find(opt => opt.value === sortValue);
    return foundOption ? foundOption.label : 'Select Sorting';
  }

  // Add a method to normalize customer type
  private normalizeCustomerType(type: string): 'Private' | 'Company' | 'Agency' | 'Client' {
    const typeMap: { [key: string]: 'Private' | 'Company' | 'Agency' | 'Client' } = {
      'Private Individual': 'Private',
      'Private': 'Private',
      'Company': 'Company',
      'Business': 'Company',
      'Agency': 'Agency',
      'Client': 'Client'
    };
    return typeMap[type] || 'Private';
  }
}
