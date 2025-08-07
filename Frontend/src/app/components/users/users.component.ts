import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsersService } from 'src/app/shared/service/users/users.service';
import { RolesService } from 'src/app/shared/service/roles/roles.service';
import { ToastrService } from 'ngx-toastr';
import { NavService } from 'src/app/shared/service/navbar/nav.service';
import { modalAnimation } from 'src/app/shared/animations/modal.animations';
import { ThemeService } from 'src/app/shared/service/theme.service';
import { LoggingService } from 'src/app/shared/service/logging.service';
import { finalize, delay } from 'rxjs/operators';
import { SelectOption } from '../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  animations: [modalAnimation]
})
export class UsersComponent implements OnInit {
  users: any[] = [];
  roles: any[] = [];
  selectedId: string = '';
  isVisible = false;
  showDeleteModal = false;
  private userToDelete: string | null = null;
  userForm: FormGroup;
  loading = false;
  searchTerm: string = '';
  filteredUsers: any[] = [];
  isEditMode = false;
  selectedUser: any = null;
  currentTheme$ = this.themeService.currentTheme$;
  SOURCE = 'users.component.ts';
  private readonly MINIMUM_LOADING_TIME = 250; // Minimum time to show loading state in ms
  // Pagination properties
  currentPage = 1;
  itemsPerPage = 15;
  totalItems = 0;
  totalPages = 0;
  loadingError: string | null = null;

  roleOptions: SelectOption[] = [];

  filterForm: FormGroup;

  userTypeOptions: SelectOption[] = [
    { value: 'User', label: 'User' },
    { value: 'Admin', label: 'Admin' },
    { value: 'Super Admin', label: 'Super Admin' }
  ];

  constructor(
    private usersService: UsersService,
    private rolesService: RolesService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private navService: NavService,
    private themeService: ThemeService,
    private loggingService: LoggingService
  ) {
    this.userForm = this.fb.group({
      first_name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/)
      ]],
      last_name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/)
      ]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', []],
      user_type: ['User', [Validators.required]],
      role_id: ['', [Validators.required]]
    });

    this.filterForm = this.fb.group({
      searchTerm: [''],
      roleAdv: ['']
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    this.navService.setTitle('User Management');
    this.navService.setSubtitle('Manage users in your corporation');

    // Update role options after roles are loaded
    this.rolesService.getResources().subscribe(response => {
      if (response.success) {
        this.roleOptions = [
          
          ...response.data.map((role: any) => ({ 
            value: role.role_id, 
            label: role.name 
          }))
        ];
      }
    });
  }

  loadUsers(): void {
    this.loading = true;
    const startTime = Date.now();
    
    this.usersService.getAllUsers(this.currentPage, this.itemsPerPage, this.searchTerm).pipe(
      delay(Math.max(0, this.MINIMUM_LOADING_TIME - (Date.now() - startTime))),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.users = response.data;
          this.totalItems = response.totalItems;
          this.totalPages = response.totalPages;
        } else {
          this.toastr.error('Failed to load users', 'Error');
        }
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.toastr.error(error.error?.message || 'Failed to load users', 'Error');
      }
    });
  }

  loadRoles(): void {
    this.rolesService.getResources().pipe(
      finalize(() => {
        // Handle any cleanup if needed
      })
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.roles = response.data;
        } else {
          this.toastr.error(response.message || 'Failed to load roles', 'Error');
        }
      },
      error: (error) => {
        console.error('Error loading roles:', error);
        this.toastr.error(error.error?.message || 'Failed to load roles', 'Error');
      }
    });
  }

  selectUser(id: string): void {
    this.selectedId = this.selectedId === id ? '' : id;
  }

  openModal(user?: any): void {
    this.isEditMode = !!user;
    this.selectedUser = user;
    
    if (this.isEditMode) {
      // Populate form with user data
      this.userForm.patchValue({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        user_type: user.user_type || 'N/A',
        role_id: user.role?.role_id || ''
      });

      // Remove password validation for edit mode
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
    } else {
      // Reset form for new user
      this.userForm.reset({
        user_type: 'User',
        role_id: ''
      });
      
      // Add strong password validation for new user
      this.userForm.get('password')?.setValidators([
        Validators.required,
        Validators.minLength(6),
      ]);
      this.userForm.get('password')?.updateValueAndValidity();
    }
    
    this.isVisible = true;
  }

  closeModal(): void {
    this.isVisible = false;
    this.userForm.reset();
    this.isEditMode = false;
    this.selectedUser = null;
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.loading = true;
      
      const userData = this.userForm.value;
      
      if (this.isEditMode) {
        // Update existing user
        this.usersService.updateUser(this.selectedUser.user_id, userData).subscribe({
          next: (response) => {
            if (response.success) {
              this.toastr.success('User updated successfully', 'Success');
              this.loadUsers();
              this.closeModal();
            } else {
              this.toastr.error(response.message || 'Failed to update user', 'Error');
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error updating user:', error);
            this.toastr.error(error.error?.message || 'Failed to update user', 'Error');
            this.loading = false;
          }
        });
      } else {
        // Create new user
        this.usersService.createUser(userData).subscribe({
          next: (response) => {
            if (response.success) {
              this.toastr.success('User created successfully', 'Success');
              this.loadUsers();
              this.closeModal();
            } else {
              this.toastr.error(response.message || 'Failed to create user', 'Error');
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error creating user:', error);
            this.toastr.error(error.error?.message || 'Failed to create user', 'Error');
            this.loading = false;
          }
        });
      }
    } else {
      this.toastr.error('Please fill in all required fields', 'Error');
    }
  }

  deleteUser(userId: string): void {
    this.userToDelete = userId;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.userToDelete = null;
  }

  confirmDeleteUser(): void {
    if (!this.userToDelete) return;
    
    this.loading = true;
    this.usersService.deleteUser(this.userToDelete).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('User deleted successfully', 'Success');
          this.loadUsers();
        } else {
          this.toastr.error(response.message || 'Failed to delete user', 'Error');
        }
        this.loading = false;
        this.closeDeleteModal();
      },
      error: (error) => {
        console.error('Error deleting user:', error);
        this.toastr.error(error.error?.message || 'Failed to delete user', 'Error');
        this.loading = false;
        this.closeDeleteModal();
      }
    });
  }

  filterUsers(): void {
    if (!this.searchTerm.trim()) {
      this.filteredUsers = [...this.users];
      return;
    }
    
    const searchLower = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(user => 
      user.first_name.toLowerCase().includes(searchLower) || 
      user.last_name.toLowerCase().includes(searchLower) || 
      user.email.toLowerCase().includes(searchLower)
    );
  }

  getRoleName(roleId: string): string {
    const role = this.roles.find(r => r.role_id === roleId);
    return role ? role.name : 'No Role';
  }

  formatDate(timestamp: string): string {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loading = true;
      this.loadUsers();
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

  getFieldError(field: string): string {
    const control = this.userForm.get(field);
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'This field is required';
    if (control.errors['minlength']) return `Minimum length is ${control.errors['minlength'].requiredLength} characters`;
    if (control.errors['maxlength']) return `Maximum length is ${control.errors['maxlength'].requiredLength} characters`;
    if (control.errors['email']) return 'Please enter a valid email address';
    if (control.errors['pattern']) {
      switch (field) {
        case 'first_name':
        case 'last_name':
          return 'Only letters, spaces, hyphens, and apostrophes are allowed';
        case 'password':
          return 'Password must be at least 8 characters';
        default:
          return 'Invalid format';
      }
    }
    return 'Invalid input';
  }
} 