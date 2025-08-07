import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/shared/service/Auth/Auth.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Toast, ToastrService } from 'ngx-toastr';
import { NavService } from 'src/app/shared/service/navbar/nav.service';
import { Router } from '@angular/router';
// import { SocketService } from 'src/app/shared/service/socket/socket.service';
import { LoggingService } from 'src/app/shared/service/logging.service';
import { ThemeService } from 'src/app/shared/service/theme.service';
import { SettingService } from 'src/app/shared/service/settings/setting.service';

interface ThemeColor {
  name: string;
  value: string;
}

interface OrganizationData {
  organization_number?: string;
  organization_name?: string;
  organization_email?: string;
  organization_phone?: string;
  business_category?: string;
  legal_form?: string;
  company_email?: string;
  company_phone?: string;
}

interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  type: string;
  corp?: {
    corp_id: string;
    corp_name: string;
  };
  theme?: string;
  profileImage?: string;
  mobile?: string;
  organization?: OrganizationData;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  userData: UserData = {
    id: '',
    email: '',
    first_name: '',
    last_name: '',
    type: ''
  };
  showThemeSettings = false;
  profileBinaryFile: any;
  loading = false;
  showPasswordModal = false;
  showDeleteModal = false;
  SOURCE = 'profile.component.ts';
  currentColor$ = this.themeService.currentColor$;
  
  // Logo related properties
  websiteLogo: string | null = null;
  selectedLogoFile: File | null = null;
  private logoInput: HTMLInputElement | null = null;
  
  // Theme customization
  currentColor = '#3b82f6';  // Default blue
  customColorInput = '#3b82f6';
  defaultColor = '#3b82f6';
  
  // Predefined color options
  predefinedColors: ThemeColor[] = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#10b981' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Cyan', value: '#06b6d4' },
  ];

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    public toastr: ToastrService,
    private navService: NavService,
    private router: Router,
    private loggingService: LoggingService,
    private themeService: ThemeService,
    private settingService: SettingService
  ) {
    this.profileForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', Validators.required],
      profileImage: [File],
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, {
      validator: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(g: FormGroup) {
    const newPassword = g.get('newPassword')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : {'mismatch': true};
  }

  formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.navService.setTitle('Settings');
    this.navService.setSubtitle('Manage your account settings');
    
    // Subscribe to color changes
    this.currentColor$.subscribe(color => {
      this.currentColor = color;
      this.customColorInput = color;
    });

    this.authService.getUserProfileData().subscribe({
      next: (data: any) => {
        if (data) {
          this.userData = data;
          this.showThemeSettings = data.type !== 'User';
          this.profileForm.patchValue({
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            mobile: data.mobile,
            profileImage: data.profileImage
          });
          
          // Initialize color from user data if available
          if (data.theme) {
            this.currentColor = data.theme;
            this.customColorInput = data.theme;
          }

          // Load logo if user is admin
          if (data.type !== 'User') {
            this.loadLogo();
          }
        }
      }
    });
  }

  logout() {
    try {
      // First disconnect socket
      // this.socketService.disconnect();
      
      // Then perform auth logout which will handle navigation
      this.authService.logout();
      
    } catch (error) {
      this.toastr.error('Something went wrong while logging out');
    }
  }
  openFileSelect(): void {
    const file = document.getElementById("profileImage")
    file?.click();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      const file = input.files[0];
      this.profileBinaryFile=file;
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          this.userData.profileImage = e.target.result.toString();
        }
      };
      reader.readAsDataURL(file);
      this.profileForm.patchValue({
        profileImage: file
      });
    }
  }
  onSave(): void {
    this.loading = true;
    const formData = new FormData();
    const _id: any = this.authService.getUserIdFromToken();
    formData.append('first_name', this.profileForm.get('first_name')?.value);
    formData.append('last_name', this.profileForm.get('last_name')?.value);
    formData.append('email', this.profileForm.get('email')?.value);
    formData.append('mobile', this.profileForm.get('mobile')?.value);
    formData.append('_id', _id);
    if (this.profileBinaryFile) {
      formData.append('profileImage', this.profileBinaryFile);
    }
    
    this.authService.updateProfile(formData).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.data) {
          // Update the form with the new data
          this.userData = res.data;
        }
        this.toastr.success("Profile Updated Successfully");
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error("Something went wrong.");
      }
    });
  }

  openChangePasswordModal(): void {
    this.showPasswordModal = true;
    this.passwordForm.reset();
  }

  closeChangePasswordModal(): void {
    this.showPasswordModal = false;
    this.passwordForm.reset();
  }

  onChangePassword(): void {
    if (this.passwordForm.valid) {
      this.loading = true;
      const { currentPassword, newPassword } = this.passwordForm.value;
      
      this.authService.changePassword(currentPassword, newPassword).subscribe({
        next: () => {
          this.loading = false;
          this.toastr.success('Password changed successfully');
          this.closeChangePasswordModal();
        },
        error: (err) => {
          this.loading = false;
          this.toastr.error(err.error.message || 'Failed to change password');
        }
      });
    }
  }

  openDeleteAccountModal(): void {
    this.showDeleteModal = true;
  }

  closeDeleteAccountModal(): void {
    this.showDeleteModal = false;
  }

  deleteAccount(): void {
    this.loading = true;
    this.authService.deleteAccount().subscribe({
      next: () => {
        this.toastr.success('Your account has been deleted successfully');
        this.loading = false;
        this.closeDeleteAccountModal();
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.toastr.error(error.error.message || 'Failed to delete account');
        this.loading = false;
      }
    });
  }

  setCustomColor(color: string): void {
    this.currentColor = color;
    this.customColorInput = color;
  }

  async applyCustomColor(): Promise<void> {
    try {
      // Ensure we're using the latest color from the picker
      const colorToApply = this.customColorInput || this.currentColor;
      this.currentColor = colorToApply;
      
      const result = await this.themeService.setColor(colorToApply);
      
      if (result.success) {
        this.toastr.success('Theme color applied successfully');
      } else {
        this.toastr.error(result.error || 'Failed to apply theme color');
        // Revert to previous color on error
        this.currentColor = this.defaultColor;
        this.customColorInput = this.defaultColor;
      }
    } catch (error: any) {
      this.toastr.error(error.message || 'Failed to apply theme color');
      // Revert to previous color on error
      this.currentColor = this.defaultColor;
      this.customColorInput = this.defaultColor;
    }
  }

  resetToDefaultColor(): void {
    this.currentColor = this.defaultColor;
    this.customColorInput = this.defaultColor;
  }

  openLogoFileSelect(): void {
    if (!this.logoInput) {
      this.logoInput = document.createElement('input');
      this.logoInput.type = 'file';
      this.logoInput.accept = 'image/png,image/jpeg,image/svg+xml';
      this.logoInput.onchange = (event) => this.onLogoFileChange(event);
    }
    this.logoInput.click();
  }

  onLogoFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      const file = input.files[0];
      
      // Check file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        this.toastr.error('Logo file size should not exceed 2MB');
        return;
      }

      // Check file type
      const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        this.toastr.error('Please upload a valid image file (PNG, JPG, or SVG)');
        return;
      }

      this.selectedLogoFile = file;
      
      // Preview the selected image
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          this.websiteLogo = e.target.result.toString();
        }
      };
      reader.readAsDataURL(file);
    }
  }

  uploadLogo(): void {
    if (!this.selectedLogoFile) {
      this.toastr.error('Please select a logo file first');
      return;
    }

    this.loading = true;
    this.settingService.uploadLogo(this.selectedLogoFile).subscribe({
      next: (response) => {
        if (response.success) {
          this.websiteLogo = response.logo;
          this.toastr.success('Logo uploaded successfully');
          this.selectedLogoFile = null;
          // Refresh user data to update navbar
          this.authService.getUserProfileData().subscribe();
        } else {
          this.toastr.error(response.message || 'Failed to upload logo');
        }
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.toastr.error(error.error?.message || 'Failed to upload logo');
      }
    });
  }

  removeLogo(): void {
    if (!this.websiteLogo) {
      return;
    }

    this.loading = true;
    this.settingService.removeLogo().subscribe({
      next: (response) => {
        if (response.success) {
          this.websiteLogo = null;
          this.selectedLogoFile = null;
          this.toastr.success('Logo removed successfully');
          // Refresh user data to update navbar
          this.authService.getUserProfileData().subscribe();
        } else {
          this.toastr.error(response.message || 'Failed to remove logo');
        }
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.toastr.error(error.error?.message || 'Failed to remove logo');
      }
    });
  }

  // Load current logo
  private loadLogo(): void {
    this.settingService.getLogo().subscribe({
      next: (response) => {
        if (response.success && response.logo) {
          this.websiteLogo = response.logo;
        }
      },
      error: (error) => {
      }
    });
  }
}
