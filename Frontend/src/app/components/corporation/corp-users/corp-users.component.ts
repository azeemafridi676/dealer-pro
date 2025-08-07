import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsersService } from '../../../shared/service/users/users.service';
import { ToastrService } from 'ngx-toastr';
import { NavService } from 'src/app/shared/service/navbar/nav.service';
import { modalAnimation } from 'src/app/shared/animations/modal.animations';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Role, RoleResponse } from '../../../shared/interfaces/role.interface';
import { CorporationService, UserData } from '../../../shared/service/corporation/corporation.service';
import { LoggingService } from 'src/app/shared/service/logging.service';
import { ThemeService } from 'src/app/shared/service/theme.service';

interface User {
  _id: string;
  id: string;
  corp_id: string;
  corp_name: string;
  role_id: string | null;
  first: string;
  last: string;
  email: string;
  password: string;
  type: string;
  active: boolean;
  two_factor_enabled: boolean;
  __v: number;
  UserRole?: Role;
  mobile?: string;
}

interface UserResponse {
  success: boolean;
  message?: string;
  data: User[];
}

@Component({
  selector: 'app-corp-users',
  templateUrl: './corp-users.component.html',
  styleUrls: ['./corp-users.component.scss'],
  animations: [modalAnimation],
})
export class CorpUsersComponent implements OnInit {
  @Input() selectedCorp: any;
  @Output() backToCorporations = new EventEmitter<void>();

  users: User[] = [];
  filteredUsers: User[] = [];
  roles: Role[] = [];
  loading = false;
  isVisible = false;
  isEditMode = false;
  selectedUser: User | null = null;
  viewMode: 'list' | 'details' = 'list';
  searchTerm: string = '';
  userForm: FormGroup;
  private readonly SOURCE = 'corp-users.component.ts';
  currentTheme$ = this.themeService.currentTheme$;

  constructor(
    private usersService: UsersService,
    private corporationService: CorporationService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private navService: NavService,
    private route: ActivatedRoute,
    private router: Router,
    private loggingService: LoggingService,
    private themeService: ThemeService
  ) {
    this.userForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      mobile: [''],
      user_type: ['User', Validators.required],
      role: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.selectedCorp) {
      this.loadUsers();
      this.loadRoles();
    }
  }

  loadRoles(): void {
    if (!this.selectedCorp || typeof this.selectedCorp.corp_id !== 'string') {
      this.toastr.error('No corporation selected or invalid corporation ID');
      return;
    }
    const corpId = this.selectedCorp.corp_id;
    this.usersService.getRoles(corpId).subscribe({
      next: (response: RoleResponse) => {
        if (response.success) {
          this.roles = response.data;
        } else {
          this.toastr.error(response.message || 'Failed to load roles');
        }
      },
      error: (error: any) => {
        console.error('Error loading roles:', error);
        this.toastr.error('Failed to load roles');
      }
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.usersService.getUsersByCorporation(this.selectedCorp.corp_id).subscribe({
      next: (response: UserResponse) => {
        if (response.success) {
          this.users = response.data;
          this.filteredUsers = [...this.users];
          this.navService.setTitle('Corporation Users');
          this.navService.setSubtitle(`Users for ${this.selectedCorp?.corp_name || 'Corporation'}`);
        } else {
          this.toastr.error(response.message || 'Failed to load users');
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading users:', error);
        this.toastr.error('Failed to load users');
        this.loading = false;
      }
    });
  }

  openModal(user?: any): void {
    this.isEditMode = !!user;
    this.selectedUser = user;
    
    if (user) {
      this.userForm.patchValue({
        first_name: user.first,
        last_name: user.last,
        email: user.email,
        mobile: user.mobile || '',
        user_type: user.type,
        role: user.UserRole?.name || ''
      });
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
    } else {
      this.userForm.reset({
        user_type: 'User'
      });
      this.userForm.get('password')?.setValidators([Validators.required]);
      this.userForm.get('password')?.updateValueAndValidity();
    }
    
    this.isVisible = true;
  }

  closeModal(): void {
    this.isVisible = false;
    this.userForm.reset();
    this.selectedUser = null;
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      const userData: UserData = {
        corp_id: this.selectedCorp.corp_id,
        first_name: this.userForm.value.first_name,
        last_name: this.userForm.value.last_name,
        email: this.userForm.value.email,
        password: this.userForm.value.password,
        mobile: this.userForm.value.mobile,
        user_type: this.userForm.value.user_type,
        role_id: this.roles.find(r => r.name === this.userForm.value.role)?.role_id
      };

      if (this.isEditMode && this.selectedUser) {
        this.corporationService.updateUserOfCorporation(this.selectedUser.id, userData).subscribe({
          next: (response) => {
            if (response.success) {
              this.toastr.success('User updated successfully');
              this.closeModal();
              this.loadUsers();
            } else {
              this.toastr.error(response.message || 'Failed to update user');
            }
          },
          error: (error) => {
            console.error('Error updating user:', error);
            this.toastr.error('Failed to update user');
          }
        });
      } else {
        this.corporationService.createUserInCorporation(userData).subscribe({
          next: (response) => {
            if (response.success) {
              this.toastr.success('User created successfully');
              this.closeModal();
              this.loadUsers();
            } else {
              this.toastr.error(response.message || 'Failed to create user');
            }
          },
          error: (error) => {
            console.error('Error creating user:', error);
            this.toastr.error('Failed to create user');
          }
        });
      }
    }
  }

  deleteUser(userId: string): void {
    if (confirm('Are you sure you want to deactivate this user?')) {
      this.corporationService.deactivateUser(userId).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success('User deactivated successfully');
            this.loadUsers();
          } else {
            this.toastr.error(response.message || 'Failed to deactivate user');
          }
        },
        error: (error) => {
          console.error('Error deactivating user:', error);
          this.toastr.error('Failed to deactivate user');
        }
      });
    }
  }

  onSearch(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredUsers = this.users.filter(user => 
      user.first.toLowerCase().includes(searchTerm) ||
      user.last.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    );
  }

  goBack(): void {
    this.backToCorporations.emit();
  }

  openUserDetails(user: User): void {
    this.selectedUser = user;
    this.viewMode = 'details';
  }

  goBackToList(): void {
    this.selectedUser = null;
    this.viewMode = 'list';
  }
} 