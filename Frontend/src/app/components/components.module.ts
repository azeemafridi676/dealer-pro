import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentsRoutingModule } from './components-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbPaginationModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { RouterModule } from '@angular/router';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RecaptchaModule } from 'ng-recaptcha';
import { DragDropModule } from '@angular/cdk/drag-drop';

// Auth Components
import { OtpComponent } from './Auth/otp/otp.component';
import { LoginComponent } from './Auth/login/login.component';
import { ForgetPasswordComponent } from './Auth/forget-password/forget-password.component';
import { ResetPasswordComponent } from './Auth/reset-password/reset-password.component';
import { SignUpComponent } from './Auth/sign-up/sign-up.component';
import { OrgRegistrationComponent } from './Auth/org-registration/org-registration.component';
import { AuthCallbackComponent } from './Auth/auth-callback/auth-callback.component';
import { OtpOrgRegistrationComponent } from './Auth/otp-org-registration/otp-org-registration.component';

// Dashboard Components
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';

// Settings Components
import { RolesComponent } from './settings/roles/roles.component';

// Profile Components
import { ProfileComponent } from './profile/profile.component';

// Website Components
import { HomeComponent } from '../website/home.component';

// Shared Components
import { ConfirmationModalComponent } from '../shared/components/confirmation-modal/confirmation-modal.component';

// Users Components
import { UsersComponent } from './users/users.component';
import { CorporationComponent } from './corporation/corporation.component';
import { CorpUsersComponent } from './corporation/corp-users/corp-users.component';

// Vehicle Components
import { WarehouseComponent } from './vehicles/warehouse/warehouse.component';
import { SoldComponent } from './vehicles/sold/sold.component';
import { ValuationComponent } from './vehicles/valuation/valuation.component';

// Agreement Components
import { SalesAgreementComponent } from './agreement/sales-agreement/sales-agreement.component';
import { PurchaseAgreementComponent } from './agreement/purchase-agreement/purchase-agreement.component';
import { AgencyAgreementComponent } from './agreement/agency-agreement/agency-agreement.component';
import { ReceiptComponent } from './agreement/receipt/receipt.component';
import { AgreementComponent } from './agreement/agreement.component';

// Other Components
import { CustomerComponent } from './customer/customer.component';
import { SwishComponent } from './swish/swish.component';
import { SwishAddComponent } from './swish/swish-add/swish-add.component';
import { SignAgreementComponent } from './agreement/sign-agreement/sign-agreement.component';

@NgModule({
  declarations: [
    OtpComponent,
    LoginComponent,
    ForgetPasswordComponent,
    ResetPasswordComponent,
    SignUpComponent,
    OrgRegistrationComponent,
    OtpOrgRegistrationComponent,
    AdminDashboardComponent,
    RolesComponent,
    ProfileComponent,
    HomeComponent,
    ConfirmationModalComponent,
    AuthCallbackComponent,
    UsersComponent,
    CorporationComponent,
    CorpUsersComponent,
    WarehouseComponent,
    SoldComponent,
    ValuationComponent,
    SalesAgreementComponent,
    PurchaseAgreementComponent,
    AgencyAgreementComponent,
    ReceiptComponent,
    AgreementComponent,
    CustomerComponent,
    SwishComponent,
    SwishAddComponent,
    SignAgreementComponent
  ],
  imports: [
    CommonModule,
    MatSlideToggleModule,
    ComponentsRoutingModule,
    SharedModule,
    FormsModule,
    NgbPaginationModule,
    NgbModule,
    NgxDropzoneModule,
    CKEditorModule,
    ReactiveFormsModule,
    RouterModule,
    RecaptchaModule,
    DragDropModule
  ],
  exports: [
    OtpComponent,
    LoginComponent,
    ForgetPasswordComponent,
    ResetPasswordComponent,
    SignUpComponent,
    AdminDashboardComponent,
    RolesComponent,
    ProfileComponent,
    HomeComponent,
    ConfirmationModalComponent,
    AuthCallbackComponent,
    UsersComponent,
    CorporationComponent,
    CorpUsersComponent,
    WarehouseComponent,
    SoldComponent,
    ValuationComponent,
    SalesAgreementComponent,
    PurchaseAgreementComponent,
    AgencyAgreementComponent,
    ReceiptComponent,
    AgreementComponent,
    CustomerComponent,
    SwishComponent,
    SwishAddComponent,
    RecaptchaModule,
    SignAgreementComponent,
    OtpOrgRegistrationComponent
  ]
})
export class ComponentsModule {}
