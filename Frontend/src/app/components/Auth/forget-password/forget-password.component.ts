import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/shared/service/Auth/Auth.service';
import { ThemeService } from 'src/app/shared/service/theme.service';

@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.scss'
})
export class ForgetPasswordComponent implements OnInit {
  forgotPasswordForm: FormGroup;
  loading: boolean = false;
  currentTheme$ = this.themeService.currentTheme$;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastr: ToastrService,
    private themeService: ThemeService
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.loading = true;
      const email = this.forgotPasswordForm.value.email;

      this.authService.forgotPassword(email).subscribe({
        next: (res:any) => {
          this.toastr.success(res.message);
          this.forgotPasswordForm.reset();
          this.loading = false;
        },
        error: (error:any) => { 
          this.toastr.error(error.error.message);
          this.loading = false;
        }
      });
    }
  }
}
